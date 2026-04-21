/**
 * 诊断脚本:对每个 WAV 的前 2 秒做频率扫描,看 VIS 结构是否存在。
 * VIS 标准结构:
 *   0-300ms: 1900 Hz leader
 *   300-310ms: 1200 Hz break
 *   310-610ms: 1900 Hz leader
 *   610-640ms: 1200 Hz start
 *   640-640+8*30=880ms: 8 data bits(1100/1300)
 *   880-910ms: parity
 *   910-940ms: 1200 Hz stop
 */
import fs from 'node:fs'
import path from 'node:path'
import { describe, it } from 'vitest'
import { goertzel } from '@/lib/sstv/dsp'

const SSTV_DIR = path.resolve(process.cwd(), 'sstv')
const hasDir = fs.existsSync(SSTV_DIR)
const wavFiles = hasDir
  ? fs.readdirSync(SSTV_DIR).filter((f) => f.toLowerCase().endsWith('.wav'))
  : []

function readWavSamples(filepath: string): { sampleRate: number; samples: Float32Array } {
  const buf = fs.readFileSync(filepath)
  let off = 12
  let fmt: { channels: number; sampleRate: number } | null = null
  let data: Buffer | null = null
  while (off < buf.length - 8) {
    const id = buf.toString('ascii', off, off + 4)
    const size = buf.readUInt32LE(off + 4)
    if (id === 'fmt ') {
      fmt = {
        channels: buf.readUInt16LE(off + 10),
        sampleRate: buf.readUInt32LE(off + 12)
      }
    } else if (id === 'data') {
      data = buf.subarray(off + 8, off + 8 + size)
    }
    off += 8 + size + (size % 2)
  }
  if (!fmt || !data) throw new Error('bad wav')
  const frames = data.length / (2 * fmt.channels)
  const out = new Float32Array(frames)
  for (let i = 0; i < frames; i++) out[i] = data.readInt16LE(i * 2 * fmt.channels) / 32768
  return { sampleRate: fmt.sampleRate, samples: out }
}

/** 在 [startMs, endMs] 窗口里,报告 1200/1900/1500/2300 四个频点的归一化能量。 */
function dominantFreqs(
  samples: Float32Array,
  sampleRate: number,
  startMs: number,
  endMs: number
): string {
  const start = Math.floor((startMs / 1000) * sampleRate)
  const end = Math.floor((endMs / 1000) * sampleRate)
  if (end > samples.length) return 'OOB'
  const win = samples.subarray(start, end)
  const targets = [1100, 1200, 1300, 1500, 1700, 1900, 2100, 2300]
  const energies = targets.map((f) => ({ f, e: goertzel(win, f, sampleRate) }))
  energies.sort((a, b) => b.e - a.e)
  const top = energies.slice(0, 3).map((x) => `${x.f}:${x.e.toExponential(1)}`).join(' ')
  return top
}

describe.skipIf(!hasDir || wavFiles.length === 0)('WAV 前 2 秒频率探测', () => {
  for (const filename of wavFiles) {
    it(`扫 ${filename}`, () => {
      const { sampleRate, samples } = readWavSamples(path.join(SSTV_DIR, filename))
      console.log(`\n${filename}  (${sampleRate} Hz, ${(samples.length / sampleRate).toFixed(2)}s)`)
      console.log(`  期望 VIS 结构:0-300ms 1900Hz | 300-310ms 1200Hz | 310-610ms 1900Hz | 610-640ms 1200Hz(start) | 640-880ms data bits | 880-910ms parity | 910-940ms 1200Hz(stop)`)

      // 每 50ms 扫一次前 1.2s
      for (let ms = 0; ms < 1200; ms += 50) {
        const top = dominantFreqs(samples, sampleRate, ms, ms + 30)
        console.log(`  t=${ms.toString().padStart(4, ' ')}-${(ms + 30).toString().padStart(4, ' ')}ms  top3: ${top}`)
      }

      // 然后在 1.5s 附近看看图像数据起什么样
      console.log('  --- after VIS (supposed image data) ---')
      for (let ms = 1000; ms < 1500; ms += 100) {
        const top = dominantFreqs(samples, sampleRate, ms, ms + 30)
        console.log(`  t=${ms.toString().padStart(4, ' ')}-${(ms + 30).toString().padStart(4, ' ')}ms  top3: ${top}`)
      }
    })
  }
})
