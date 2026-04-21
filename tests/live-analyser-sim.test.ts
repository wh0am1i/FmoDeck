import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { SstvDecoder } from '@/lib/sstv/decoder'
import { PcmTap } from '@/lib/sstv/pcm-tap'
import type { Mode } from '@/lib/sstv/modes/types'

const SSTV_DIR = path.resolve(process.cwd(), 'sstv')
const WAV_PATH = path.join(SSTV_DIR, '20260421_161454_robot36.wav')
const hasRobot36 = fs.existsSync(WAV_PATH)

interface Wav {
  sampleRate: number
  samples: Float32Array
}

interface DecodeResult {
  mode: Mode
  rgba: Uint8ClampedArray
}

function readWav(filepath: string): Wav {
  const buf = fs.readFileSync(filepath)
  if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WAVE') {
    throw new Error(`${filepath} 不是 RIFF/WAVE`)
  }
  let off = 12
  let fmt: { channels: number; sampleRate: number; bitsPerSample: number } | null = null
  let data: Buffer | null = null
  while (off < buf.length - 8) {
    const id = buf.toString('ascii', off, off + 4)
    const size = buf.readUInt32LE(off + 4)
    if (id === 'fmt ') {
      fmt = {
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
  if (fmt.bitsPerSample !== 16) throw new Error(`只支持 16-bit,实际 ${fmt.bitsPerSample}`)

  const totalFrames = data.length / (2 * fmt.channels)
  const out = new Float32Array(totalFrames)
  for (let i = 0; i < out.length; i++) {
    out[i] = data.readInt16LE(i * 2 * fmt.channels) / 32768
  }
  return { sampleRate: fmt.sampleRate, samples: out }
}

function decodeDirect(wav: Wav): DecodeResult {
  const chunkSamples = Math.round(0.04 * wav.sampleRate)
  const tap = new PcmTap(Math.round(wav.sampleRate * 5))
  let result: DecodeResult | null = null
  const decoder = new SstvDecoder(wav.sampleRate, {
    onDone: ({ mode, rgba }) => {
      result = { mode, rgba }
    }
  })

  for (let i = 0; i < wav.samples.length && !result; i += chunkSamples) {
    tap.write(wav.samples.subarray(i, Math.min(i + chunkSamples, wav.samples.length)))
    decoder.tick(tap)
  }
  for (let i = 0; i < 20 && !result; i++) decoder.tick(tap)
  if (!result) throw new Error('direct decode failed')
  return result
}

function decodeViaAnalyserSim(wav: Wav, intervalMs: number, fftSize: number): DecodeResult {
  const tap = new PcmTap(Math.round(wav.sampleRate * 5))
  let result: DecodeResult | null = null
  const decoder = new SstvDecoder(wav.sampleRate, {
    onDone: ({ mode, rgba }) => {
      result = { mode, rgba }
    }
  })

  const ctx = { sampleRate: wav.sampleRate, currentTime: 0 }
  const analyser = {
    fftSize,
    context: ctx,
    getFloatTimeDomainData(target: Float32Array) {
      const end = Math.floor(ctx.currentTime * wav.sampleRate)
      const start = end - target.length
      target.fill(0)
      const srcStart = Math.max(0, start)
      const srcEnd = Math.min(end, wav.samples.length)
      if (srcEnd <= srcStart) return
      target.set(wav.samples.subarray(srcStart, srcEnd), srcStart - start)
    }
  } as unknown as AnalyserNode

  const endTime = wav.samples.length / wav.sampleRate
  while (ctx.currentTime <= endTime + 1 && !result) {
    tap.pullFromAnalyser(analyser)
    decoder.tick(tap)
    ctx.currentTime += intervalMs / 1000
  }
  for (let i = 0; i < 20 && !result; i++) decoder.tick(tap)
  if (!result) throw new Error('analyser sim decode failed')
  return result
}

function meanAbsoluteError(a: Uint8ClampedArray, b: Uint8ClampedArray): number {
  if (a.length !== b.length) throw new Error('rgba length mismatch')
  let sum = 0
  for (let i = 0; i < a.length; i++) {
    sum += Math.abs((a[i] ?? 0) - (b[i] ?? 0))
  }
  return sum / a.length
}

describe.skipIf(!hasRobot36)('实时 analyser 拉样仿真', () => {
  it(
    '当前 pullFromAnalyser 路径应接近离线直写 decode',
    { timeout: 60_000 },
    () => {
      const wav = readWav(WAV_PATH)
      const direct = decodeDirect(wav)
      const live = decodeViaAnalyserSim(wav, 20, 8192)

      expect(live.mode.name).toBe(direct.mode.name)
      expect(live.rgba.length).toBe(direct.rgba.length)

      const mae = meanAbsoluteError(direct.rgba, live.rgba)
      expect(mae).toBeLessThan(6)
    }
  )
})
