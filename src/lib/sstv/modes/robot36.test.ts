// src/lib/sstv/modes/robot36.test.ts
import { describe, it, expect } from 'vitest'
import { robot36 } from './robot36'
import { synthTone, concat, brightnessToFreq, TEST_SAMPLE_RATE } from '../__tests__/fixtures'

/** 构造一行 Robot36 信号(Y + 交替色差)。 */
function synthRobot36Line(yValue: number, ryValue: number, byValue: number, row: number) {
  // 9ms sync(1200) + 3ms porch(1500) + 88ms Y + 4.5ms separator + 1.5ms porch + 44ms 色差
  // 偶行 R-Y,奇行 B-Y
  const chroma = row % 2 === 0 ? ryValue : byValue
  const separatorHz = row % 2 === 0 ? 2300 : 1500
  return concat(
    synthTone(1200, 9),
    synthTone(1500, 3),
    synthTone(brightnessToFreq(yValue), 88),
    synthTone(separatorHz, 4.5),
    synthTone(1900, 1.5),
    synthTone(brightnessToFreq(chroma), 44)
  )
}

describe('robot36', () => {
  it('基础参数正确', () => {
    expect(robot36.name).toBe('robot36')
    expect(robot36.visCode).toBe(0x88)
    expect(robot36.width).toBe(320)
    expect(robot36.height).toBe(240)
    expect(Math.abs(robot36.scanLineMs - 150)).toBeLessThan(1)
  })

  it('全白 Y 解码后中间像素 R/G/B 都接近 255', () => {
    const line = synthRobot36Line(255, 128, 128, 0)
    const rgba = robot36.decodeLine(line, 0, {}, TEST_SAMPLE_RATE)
    const mid = 160 * 4 // 中间像素
    // YCrCb → RGB,Y=255, Cr=Cb=128 → R≈G≈B≈255
    expect(rgba[mid]!).toBeGreaterThan(220)
    expect(rgba[mid + 1]!).toBeGreaterThan(220)
    expect(rgba[mid + 2]!).toBeGreaterThan(220)
    expect(rgba[mid + 3]).toBe(255)
  })

  it('全黑 Y 解码后中间像素 R/G/B 都接近 0', () => {
    const line = synthRobot36Line(0, 128, 128, 0)
    const rgba = robot36.decodeLine(line, 0, {}, TEST_SAMPLE_RATE)
    const mid = 160 * 4
    expect(rgba[mid]!).toBeLessThan(40)
    expect(rgba[mid + 1]!).toBeLessThan(40)
    expect(rgba[mid + 2]!).toBeLessThan(40)
  })

  it('RGBA 长度 = width × 4', () => {
    const line = synthRobot36Line(128, 128, 128, 0)
    const rgba = robot36.decodeLine(line, 0, {}, TEST_SAMPLE_RATE)
    expect(rgba.length).toBe(320 * 4)
  })
})
