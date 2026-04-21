import { describe, expect, it } from 'vitest'
import { sampleBrightnessSection } from './sample-section'

describe('sampleBrightnessSection', () => {
  it('不会把 section 前面的频率混进最左侧像素', () => {
    const sampleRate = 1000
    const freq = new Float32Array(30).fill(1500)
    freq.fill(2300, 10, 20)

    const out = sampleBrightnessSection(freq, sampleRate, 10, 20, 5)

    expect(out[0]).toBeGreaterThan(240)
  })

  it('不会把 section 后面的频率混进最右侧像素', () => {
    const sampleRate = 1000
    const freq = new Float32Array(30).fill(1500)
    freq.fill(2300, 10, 20)

    const out = sampleBrightnessSection(freq, sampleRate, 10, 20, 5)

    expect(out[4]).toBeGreaterThan(240)
  })
})
