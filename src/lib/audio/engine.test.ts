import { describe, expect, it } from 'vitest'
import { chooseRawDecodeStartTime } from './engine'

describe('chooseRawDecodeStartTime', () => {
  it('首次或落后时重锚到更保守的 decode lead', () => {
    expect(chooseRawDecodeStartTime(0, 10)).toBeCloseTo(11, 6)
    expect(chooseRawDecodeStartTime(10.02, 10)).toBeCloseTo(11, 6)
  })

  it('已有连续队列时保持无缝拼接', () => {
    expect(chooseRawDecodeStartTime(10.9, 10)).toBeCloseTo(10.9, 6)
    expect(chooseRawDecodeStartTime(12.4, 10)).toBeCloseTo(12.4, 6)
  })
})
