// src/lib/sstv/vis.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { VisDetector } from './vis'
import { synthVis, synthTone, concat, TEST_SAMPLE_RATE } from './__tests__/fixtures'

describe('VisDetector', () => {
  let det: VisDetector

  beforeEach(() => {
    det = new VisDetector(TEST_SAMPLE_RATE)
  })

  it('识别 Robot36 VIS(0x88)', () => {
    const signal = concat(synthTone(1000, 200), synthVis(0x88), synthTone(2300, 100))
    const result = det.feed(signal)
    expect(result).not.toBeNull()
    expect(result!.visCode).toBe(0x88)
  })

  it('识别 Martin M1 VIS(0x2C)', () => {
    const signal = concat(synthTone(500, 100), synthVis(0x2c))
    const result = det.feed(signal)
    expect(result).not.toBeNull()
    expect(result!.visCode).toBe(0x2c)
  })

  it('识别 Martin M2 VIS(0x28)', () => {
    const result = det.feed(synthVis(0x28))
    expect(result).not.toBeNull()
    expect(result!.visCode).toBe(0x28)
  })

  it('纯噪声 / 无 VIS 返回 null', () => {
    const signal = synthTone(500, 1000)
    expect(det.feed(signal)).toBeNull()
  })

  it('识别后 reset 可以再识别', () => {
    expect(det.feed(synthVis(0x88))).not.toBeNull()
    det.reset()
    expect(det.feed(synthVis(0x2c))).not.toBeNull()
  })

  it('endOffset 在样本流末尾附近(误差 < 1 个 bit 长度)', () => {
    const vis = synthVis(0x88)
    const result = det.feed(vis)
    expect(result).not.toBeNull()
    const stopBitSamples = Math.round(0.03 * TEST_SAMPLE_RATE)
    expect(result!.endOffset).toBeLessThan(stopBitSamples * 2)
    expect(result!.endOffset).toBeGreaterThanOrEqual(0)
  })
})
