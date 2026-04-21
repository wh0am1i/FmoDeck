// src/lib/sstv/dsp.test.ts
import { describe, it, expect } from 'vitest'
import { goertzel, estimateFreq, freqToBrightness } from './dsp'
import { synthTone, TEST_SAMPLE_RATE } from './__tests__/fixtures'

describe('dsp / goertzel', () => {
  it('检出 1900 Hz tone 的能量显著高于 500 Hz', () => {
    const samples = synthTone(1900, 50)
    const on = goertzel(samples, 1900, TEST_SAMPLE_RATE)
    const off = goertzel(samples, 500, TEST_SAMPLE_RATE)
    expect(on).toBeGreaterThan(off * 10)
  })

  it('goertzel 能量与 tone 时长成正比(长度 ×2 → 能量 ×4)', () => {
    const short = synthTone(1900, 25)
    const long = synthTone(1900, 50)
    const shortE = goertzel(short, 1900, TEST_SAMPLE_RATE)
    const longE = goertzel(long, 1900, TEST_SAMPLE_RATE)
    expect(longE / shortE).toBeGreaterThan(3)
    expect(longE / shortE).toBeLessThan(5)
  })
})

describe('dsp / estimateFreq', () => {
  it('纯 2000 Hz tone 估计频率在 ±20 Hz 内', () => {
    const samples = synthTone(2000, 5)
    const f = estimateFreq(samples, TEST_SAMPLE_RATE, 1500, 2300)
    expect(Math.abs(f - 2000)).toBeLessThan(20)
  })

  it('1500 Hz (黑) 和 2300 Hz (白) 都能估准', () => {
    const black = estimateFreq(synthTone(1500, 5), TEST_SAMPLE_RATE, 1500, 2300)
    const white = estimateFreq(synthTone(2300, 5), TEST_SAMPLE_RATE, 1500, 2300)
    expect(Math.abs(black - 1500)).toBeLessThan(20)
    expect(Math.abs(white - 2300)).toBeLessThan(20)
  })
})

describe('dsp / freqToBrightness', () => {
  it('1500 Hz → 0(黑)', () => {
    expect(freqToBrightness(1500)).toBe(0)
  })
  it('2300 Hz → 255(白)', () => {
    expect(freqToBrightness(2300)).toBe(255)
  })
  it('1900 Hz → 127 (±1 取整)', () => {
    expect(freqToBrightness(1900)).toBeGreaterThanOrEqual(126)
    expect(freqToBrightness(1900)).toBeLessThanOrEqual(128)
  })
  it('越界截断', () => {
    expect(freqToBrightness(1000)).toBe(0)
    expect(freqToBrightness(3000)).toBe(255)
  })
})
