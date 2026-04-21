import { describe, expect, it } from 'vitest'
import { detectSyncPulseOffsetMs } from './sync-detect'
import { instantFreq, toAnalytic } from '../dsp'
import { synthTone, concat, TEST_SAMPLE_RATE } from '../__tests__/fixtures'

function seededNoise(length: number, amplitude: number, seed: number): Float32Array {
  let state = seed >>> 0
  const out = new Float32Array(length)
  for (let i = 0; i < length; i++) {
    state = (state * 1664525 + 1013904223) >>> 0
    const unit = state / 0x100000000
    out[i] = (unit * 2 - 1) * amplitude
  }
  return out
}

function addNoise(signal: Float32Array, amplitude: number, seed: number): Float32Array {
  const out = new Float32Array(signal.length)
  const noise = seededNoise(signal.length, amplitude, seed)
  for (let i = 0; i < signal.length; i++) out[i] = (signal[i] ?? 0) + (noise[i] ?? 0)
  return out
}

function stddev(values: number[]): number {
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length
  return Math.sqrt(variance)
}

describe('detectSyncPulseOffsetMs', () => {
  it('在带噪 Robot36 行上仍保持稳定，不会因过窄 sync 窗造成大幅抖动', () => {
    const offsets: number[] = []
    const preSyncNoiseSamples = Math.round((1.5 * TEST_SAMPLE_RATE) / 1000)
    const baseLine = concat(
      seededNoise(preSyncNoiseSamples, 0.25, 0x1234),
      synthTone(1200, 9),
      synthTone(1500, 3),
      synthTone(2300, 88),
      synthTone(1500, 4.5),
      synthTone(1900, 1.5),
      synthTone(2300, 44)
    )

    for (let trial = 0; trial < 64; trial++) {
      const noisy = addNoise(baseLine, 0.08, trial + 1)
      const { i, q } = toAnalytic(noisy, TEST_SAMPLE_RATE)
      const freq = instantFreq(i, q, TEST_SAMPLE_RATE)
      const result = detectSyncPulseOffsetMs(freq, TEST_SAMPLE_RATE, {
        syncMs: 9,
        searchMs: 40,
        clampMs: 20
      })

      offsets.push(result.clamped)
    }

    expect(stddev(offsets)).toBeLessThan(0.5)
  })
})
