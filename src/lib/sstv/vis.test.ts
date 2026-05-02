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

  it('识别 Martin M1 VIS(0xAC = on-wire 含 parity)', () => {
    const signal = concat(synthTone(500, 100), synthVis(0xac))
    const result = det.feed(signal)
    expect(result).not.toBeNull()
    expect(result!.visCode).toBe(0xac)
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

  it('缺少完整 leader-break-leader 前导时不误判为 VIS', () => {
    const tailOnly = concat(
      synthTone(1900, 30),
      synthTone(1200, 30), // start bit
      synthTone(1300, 30),
      synthTone(1300, 30),
      synthTone(1300, 30),
      synthTone(1100, 30),
      synthTone(1300, 30),
      synthTone(1300, 30),
      synthTone(1300, 30),
      synthTone(1100, 30),
      synthTone(1200, 30) // stop bit
    )
    expect(det.feed(tailOnly)).toBeNull()
  })

  it('缺少 1200Hz break 时不误判为 VIS', () => {
    const noBreak = concat(
      synthTone(1900, 300),
      synthTone(1900, 10),
      synthTone(1900, 300),
      synthTone(1200, 30),
      synthTone(1300, 30),
      synthTone(1300, 30),
      synthTone(1300, 30),
      synthTone(1100, 30),
      synthTone(1300, 30),
      synthTone(1300, 30),
      synthTone(1300, 30),
      synthTone(1100, 30),
      synthTone(1200, 30)
    )
    expect(det.feed(noBreak)).toBeNull()
  })

  it('识别后 reset 可以再识别', () => {
    expect(det.feed(synthVis(0x88))).not.toBeNull()
    det.reset()
    expect(det.feed(synthVis(0xac))).not.toBeNull()
  })

  it('一段 leader 被 fade 干扰时仍能识别(放宽前导容忍)', () => {
    // 模拟 QSB:第一段 leader 被噪声盖掉(用 2400Hz 凑成"非 1900 主导"),
    // 第二段 leader 和后续结构正常。VIS 应仍可识别。
    const fadedFirstLeader = concat(
      synthTone(2400, 300), // 第一段 leader 被噪声替代
      synthTone(1200, 10),
      synthTone(1900, 300), // 第二段 leader 正常
      synthTone(1200, 30) // start bit
    )
    // 跟上 0x88 的 8 数据 bits + stop
    const visBits = synthVis(0x88).subarray(
      Math.round(((300 + 10 + 300 + 30) / 1000) * TEST_SAMPLE_RATE)
    )
    const signal = concat(fadedFirstLeader, visBits)
    const result = det.feed(signal)
    expect(result).not.toBeNull()
    expect(result!.visCode).toBe(0x88)
  })

  it('两段 leader 都被 fade 时仍拒绝识别', () => {
    const noLeader = concat(
      synthTone(2400, 300),
      synthTone(1200, 10),
      synthTone(2400, 300),
      synthTone(1200, 30) // start bit
    )
    const visBits = synthVis(0x88).subarray(
      Math.round(((300 + 10 + 300 + 30) / 1000) * TEST_SAMPLE_RATE)
    )
    const signal = concat(noLeader, visBits)
    expect(det.feed(signal)).toBeNull()
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
