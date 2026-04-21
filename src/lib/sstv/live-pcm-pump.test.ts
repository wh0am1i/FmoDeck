import { describe, expect, it, vi } from 'vitest'
import { synthTone, TEST_SAMPLE_RATE } from './__tests__/fixtures'
import { LivePcmPump } from './live-pcm-pump'
import type { PcmTap } from './pcm-tap'

describe('LivePcmPump', () => {
  it('同采样率 chunk 直接写入 tap 并触发 decoder.tick', () => {
    const totals: number[] = []
    const tick = vi.fn((tap: PcmTap) => {
      totals.push(tap.totalWritten)
    })
    const pump = new LivePcmPump(TEST_SAMPLE_RATE, { tick })
    const chunk = synthTone(1900, 40, TEST_SAMPLE_RATE)

    pump.push(chunk, TEST_SAMPLE_RATE)

    expect(tick).toHaveBeenCalledTimes(1)
    expect(totals[0]).toBe(chunk.length)
  })

  it('不同采样率 chunk 会先升采样再写入 tap', () => {
    const totals: number[] = []
    const tick = vi.fn((tap: PcmTap) => {
      totals.push(tap.totalWritten)
    })
    const pump = new LivePcmPump(TEST_SAMPLE_RATE, { tick })
    const chunk = synthTone(1200, 100, 8000)

    pump.push(chunk, 8000)

    expect(tick).toHaveBeenCalledTimes(1)
    expect(totals[0]).toBeGreaterThan(chunk.length * 5)
  })

  it('多块输入时 totalWritten 累加且每块都推进 decoder', () => {
    const totals: number[] = []
    const tick = vi.fn((tap: PcmTap) => {
      totals.push(tap.totalWritten)
    })
    const pump = new LivePcmPump(TEST_SAMPLE_RATE, { tick })

    pump.push(synthTone(1200, 40, 8000), 8000)
    pump.push(synthTone(1500, 60, 8000), 8000)

    expect(tick).toHaveBeenCalledTimes(2)
    const firstTotal = totals[0] ?? 0
    const secondTotal = totals[1] ?? 0
    expect(secondTotal).toBeGreaterThan(firstTotal)
  })
})
