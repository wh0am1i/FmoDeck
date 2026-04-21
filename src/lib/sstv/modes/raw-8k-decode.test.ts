import { describe, expect, it } from 'vitest'
import { robot36 } from './robot36'
import { robot72 } from './robot72'
import { synthTone, concat, brightnessToFreq } from '../__tests__/fixtures'

const RAW_SAMPLE_RATE = 8000

function synthRobot36Pair(y0: number, cr: number, y1: number, cb: number): Float32Array {
  return concat(
    synthTone(1200, 9, RAW_SAMPLE_RATE),
    synthTone(1500, 3, RAW_SAMPLE_RATE),
    synthTone(brightnessToFreq(y0), 88, RAW_SAMPLE_RATE),
    synthTone(2300, 4.5, RAW_SAMPLE_RATE),
    synthTone(1900, 1.5, RAW_SAMPLE_RATE),
    synthTone(brightnessToFreq(cr), 44, RAW_SAMPLE_RATE),
    synthTone(1200, 9, RAW_SAMPLE_RATE),
    synthTone(1500, 3, RAW_SAMPLE_RATE),
    synthTone(brightnessToFreq(y1), 88, RAW_SAMPLE_RATE),
    synthTone(1500, 4.5, RAW_SAMPLE_RATE),
    synthTone(1900, 1.5, RAW_SAMPLE_RATE),
    synthTone(brightnessToFreq(cb), 44, RAW_SAMPLE_RATE)
  )
}

function synthRobot72Line(yValue: number, ryValue: number, byValue: number): Float32Array {
  return concat(
    synthTone(1200, 9, RAW_SAMPLE_RATE),
    synthTone(1500, 3, RAW_SAMPLE_RATE),
    synthTone(brightnessToFreq(yValue), 138, RAW_SAMPLE_RATE),
    synthTone(1500, 4.5, RAW_SAMPLE_RATE),
    synthTone(1900, 1.5, RAW_SAMPLE_RATE),
    synthTone(brightnessToFreq(ryValue), 69, RAW_SAMPLE_RATE),
    synthTone(2300, 4.5, RAW_SAMPLE_RATE),
    synthTone(1500, 1.5, RAW_SAMPLE_RATE),
    synthTone(brightnessToFreq(byValue), 69, RAW_SAMPLE_RATE)
  )
}

describe('raw 8k SSTV decode', () => {
  it('Robot36 在原始 8kHz PCM 上仍能解出接近白色的亮度', () => {
    const rgba = robot36.decodeLine(
      synthRobot36Pair(255, 128, 255, 128),
      0,
      {},
      RAW_SAMPLE_RATE
    )
    const mid0 = 160 * 4
    const mid1 = (320 + 160) * 4

    expect(rgba[mid0]!).toBeGreaterThan(200)
    expect(rgba[mid0 + 1]!).toBeGreaterThan(200)
    expect(rgba[mid0 + 2]!).toBeGreaterThan(200)
    expect(rgba[mid1]!).toBeGreaterThan(200)
    expect(rgba[mid1 + 1]!).toBeGreaterThan(200)
    expect(rgba[mid1 + 2]!).toBeGreaterThan(200)
  })

  it('Robot72 在原始 8kHz PCM 上仍能解出接近白色的亮度', () => {
    const rgba = robot72.decodeLine(
      synthRobot72Line(255, 128, 128),
      0,
      {},
      RAW_SAMPLE_RATE
    )
    const mid = 160 * 4

    expect(rgba[mid]!).toBeGreaterThan(200)
    expect(rgba[mid + 1]!).toBeGreaterThan(200)
    expect(rgba[mid + 2]!).toBeGreaterThan(200)
  })
})
