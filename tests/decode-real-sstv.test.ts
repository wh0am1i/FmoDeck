/**
 * 真实 WAV 离线解码:读 sstv/*.wav,跑 decoder,写 PNG 到同目录便于目测。
 *
 * 不是生产测试——用来在真实音频样本上检验解码器表现。
 * sstv/ 目录不存在时整个 suite 跳过,不影响 CI。
 *
 * 运行方式:`pnpm vitest run tests/decode-real-sstv.test.ts`
 */
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { describe, it, expect } from 'vitest'
import { SstvDecoder } from '@/lib/sstv/decoder'
import { PcmTap } from '@/lib/sstv/pcm-tap'
import type { Mode } from '@/lib/sstv/modes/types'

const SSTV_DIR = path.resolve(process.cwd(), 'sstv')
const hasDir = fs.existsSync(SSTV_DIR)
const wavFiles = hasDir
  ? fs.readdirSync(SSTV_DIR).filter((f) => f.toLowerCase().endsWith('.wav'))
  : []

// ---------- WAV 解析(PCM16 / mono / 指定 SR) ----------
interface Wav {
  sampleRate: number
  samples: Float32Array
}

function readWav(filepath: string): Wav {
  const buf = fs.readFileSync(filepath)
  if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WAVE') {
    throw new Error(`${filepath} 不是 RIFF/WAVE`)
  }
  let off = 12
  let fmt: { audioFormat: number; channels: number; sampleRate: number; bitsPerSample: number } | null = null
  let data: Buffer | null = null
  while (off < buf.length - 8) {
    const id = buf.toString('ascii', off, off + 4)
    const size = buf.readUInt32LE(off + 4)
    if (id === 'fmt ') {
      fmt = {
        audioFormat: buf.readUInt16LE(off + 8),
        channels: buf.readUInt16LE(off + 10),
        sampleRate: buf.readUInt32LE(off + 12),
        bitsPerSample: buf.readUInt16LE(off + 22)
      }
    } else if (id === 'data') {
      data = buf.subarray(off + 8, off + 8 + size)
    }
    off += 8 + size + (size % 2)
  }
  if (!fmt || !data) throw new Error('WAV 缺 fmt 或 data chunk')
  if (fmt.audioFormat !== 1) throw new Error(`只支持 PCM(1),实际 ${fmt.audioFormat}`)
  if (fmt.bitsPerSample !== 16) throw new Error(`只支持 16-bit,实际 ${fmt.bitsPerSample}`)

  const totalFrames = data.length / (2 * fmt.channels)
  const out = new Float32Array(totalFrames)
  for (let i = 0; i < out.length; i++) {
    // 只取 channel 0
    const s = data.readInt16LE(i * 2 * fmt.channels)
    out[i] = s / 32768
  }
  return { sampleRate: fmt.sampleRate, samples: out }
}

// ---------- PNG 写入(无依赖) ----------
const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

function crc32(buf: Buffer): number {
  let c = 0xffffffff
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff]! ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function pngChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const typeBuf = Buffer.from(type, 'ascii')
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([len, typeBuf, data, crc])
}

function writePng(filepath: string, width: number, height: number, rgba: Uint8ClampedArray): void {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  const stride = width * 4
  const raw = Buffer.alloc((stride + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0 // filter byte
    for (let x = 0; x < stride; x++) {
      raw[y * (stride + 1) + 1 + x] = rgba[y * stride + x]!
    }
  }
  const idat = zlib.deflateSync(raw)
  fs.writeFileSync(
    filepath,
    Buffer.concat([signature, pngChunk('IHDR', ihdr), pngChunk('IDAT', idat), pngChunk('IEND', Buffer.alloc(0))])
  )
}

// ---------- 主驱动 ----------
interface DecodeResult {
  mode: Mode
  rgba: Uint8ClampedArray
}

function decode(wav: Wav): DecodeResult {
  const chunkSamples = Math.round(0.04 * wav.sampleRate)
  const tap = new PcmTap(Math.round(wav.sampleRate * 5))

  let result: DecodeResult | null = null
  let identifiedMode: Mode | null = null

  const decoder = new SstvDecoder(wav.sampleRate, {
    onStart: (mode) => {
      identifiedMode = mode
      console.log(`  [VIS] ${mode.displayName} (0x${mode.visCode.toString(16)}) ${mode.width}×${mode.height}`)
    },
    onDone: ({ mode, rgba }) => {
      result = { mode, rgba }
    },
    onTimeout: () => {
      console.log('  [timeout] 解码超时')
    }
  })

  let i = 0
  while (i < wav.samples.length && !result) {
    const end = Math.min(i + chunkSamples, wav.samples.length)
    tap.write(wav.samples.subarray(i, end))
    decoder.tick(tap)
    i = end
  }
  for (let k = 0; k < 20 && !result && decoder.state.type !== 'idle'; k++) {
    decoder.tick(tap)
  }

  if (!result && identifiedMode && decoder.state.type === 'decoding') {
    console.log(`  [partial] 识别到模式但未完整解码,已解 ${decoder.state.nextRow}/${identifiedMode.height} 行`)
  }

  if (!result) {
    throw new Error(
      identifiedMode
        ? `${identifiedMode.displayName} 未完整解码`
        : '未识别到 VIS 头'
    )
  }
  return result
}

describe.skipIf(!hasDir || wavFiles.length === 0)('真实 WAV 解码(sstv/)', () => {
  for (const filename of wavFiles) {
    it(
      `解 ${filename}`,
      { timeout: 60_000 },
      () => {
        const inPath = path.join(SSTV_DIR, filename)
        const outPath = inPath.replace(/\.wav$/i, '.png')
        console.log(`\n${filename}`)
        const wav = readWav(inPath)
        console.log(`  ${wav.sampleRate} Hz, ${(wav.samples.length / wav.sampleRate).toFixed(2)} s`)
        const result = decode(wav)
        writePng(outPath, result.mode.width, result.mode.height, result.rgba)
        console.log(`  写入 ${path.basename(outPath)}`)
        expect(result.rgba.length).toBe(result.mode.width * result.mode.height * 4)
      }
    )
  }
})
