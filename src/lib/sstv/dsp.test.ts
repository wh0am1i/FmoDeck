// src/lib/sstv/dsp.test.ts
import { describe, it, expect } from 'vitest'
import { goertzel, estimateFreq, freqToBrightness, toAnalytic, instantFreq } from './dsp'
import { synthTone, concat, TEST_SAMPLE_RATE } from './__tests__/fixtures'

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

describe('dsp / instantFreq', () => {
  it('纯 2000 Hz tone 的瞬时频率在稳态下接近 2000', () => {
    const samples = synthTone(2000, 50)
    const { i, q } = toAnalytic(samples, TEST_SAMPLE_RATE)
    const freq = instantFreq(i, q, TEST_SAMPLE_RATE)
    // 跳过前 200 样本(LPF 瞬态);剩余平均
    let sum = 0
    let cnt = 0
    for (let k = 200; k < freq.length; k++) {
      sum += freq[k]!
      cnt++
    }
    const mean = sum / cnt
    expect(Math.abs(mean - 2000)).toBeLessThan(20)
  })

  it('1500 Hz (黑) 估计正确', () => {
    const samples = synthTone(1500, 50)
    const { i, q } = toAnalytic(samples, TEST_SAMPLE_RATE)
    const freq = instantFreq(i, q, TEST_SAMPLE_RATE)
    let sum = 0
    let cnt = 0
    for (let k = 200; k < freq.length; k++) {
      sum += freq[k]!
      cnt++
    }
    expect(Math.abs(sum / cnt - 1500)).toBeLessThan(20)
  })

  it('2300 Hz (白) 估计正确', () => {
    const samples = synthTone(2300, 50)
    const { i, q } = toAnalytic(samples, TEST_SAMPLE_RATE)
    const freq = instantFreq(i, q, TEST_SAMPLE_RATE)
    let sum = 0
    let cnt = 0
    for (let k = 200; k < freq.length; k++) {
      sum += freq[k]!
      cnt++
    }
    expect(Math.abs(sum / cnt - 2300)).toBeLessThan(20)
  })

  it('1500 Hz 拼接 2300 Hz 的 tone,瞬时频率能跟上阶跃', () => {
    // 前 25ms 是 1500,后 25ms 是 2300
    const samples = concat(synthTone(1500, 25), synthTone(2300, 25))
    const { i, q } = toAnalytic(samples, TEST_SAMPLE_RATE)
    const freq = instantFreq(i, q, TEST_SAMPLE_RATE)

    // 1500 段的稳态(跳过 LPF 瞬态):前 25ms = 1200 样本,200..1100 取平均
    let s1 = 0
    let c1 = 0
    for (let k = 200; k < 1100; k++) {
      s1 += freq[k]!
      c1++
    }
    expect(Math.abs(s1 / c1 - 1500)).toBeLessThan(30)

    // 2300 段的稳态:1200 样本开始,跳 200 样本 LPF 瞬态,1400..末尾取平均
    let s2 = 0
    let c2 = 0
    for (let k = 1400; k < freq.length; k++) {
      s2 += freq[k]!
      c2++
    }
    expect(Math.abs(s2 / c2 - 2300)).toBeLessThan(30)
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
