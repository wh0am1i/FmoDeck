// src/lib/sstv/modes/robot36.test.ts
import { describe, it, expect } from 'vitest'
import { robot36 } from './robot36'
import { synthTone, concat, brightnessToFreq, TEST_SAMPLE_RATE } from '../__tests__/fixtures'

/**
 * 合成一对 row(2 行 300ms):
 *   第一行(偶行): sync(1200) + porch(1500) + Y[y0] + 2300Hz sep + porch(1900) + chroma[cr]
 *   第二行(奇行): sync(1200) + porch(1500) + Y[y1] + 1500Hz sep + porch(1900) + chroma[cb]
 */
function synthRobot36Pair(y0: number, cr: number, y1: number, cb: number): Float32Array {
  return concat(
    // Row 0 (even, Cr follows 2300Hz separator)
    synthTone(1200, 9),
    synthTone(1500, 3),
    synthTone(brightnessToFreq(y0), 88),
    synthTone(2300, 4.5),
    synthTone(1900, 1.5),
    synthTone(brightnessToFreq(cr), 44),
    // Row 1 (odd, Cb follows 1500Hz separator)
    synthTone(1200, 9),
    synthTone(1500, 3),
    synthTone(brightnessToFreq(y1), 88),
    synthTone(1500, 4.5),
    synthTone(1900, 1.5),
    synthTone(brightnessToFreq(cb), 44)
  )
}

describe('robot36', () => {
  it('基础参数正确', () => {
    expect(robot36.name).toBe('robot36')
    expect(robot36.visCode).toBe(0x88)
    expect(robot36.width).toBe(320)
    expect(robot36.height).toBe(240)
    expect(robot36.rowsPerScanLine).toBe(2)
    expect(Math.abs(robot36.scanLineMs - 300)).toBeLessThan(1)
  })

  it('返回 2 行 RGBA(width × 2 × 4 字节)', () => {
    const samples = synthRobot36Pair(128, 128, 128, 128)
    const rgba = robot36.decodeLine(samples, 0, {}, TEST_SAMPLE_RATE)
    expect(rgba.length).toBe(320 * 2 * 4)
  })

  it('全白 Y(Y=255, 中性色差 128)两行均接近白色', () => {
    const samples = synthRobot36Pair(255, 128, 255, 128)
    const rgba = robot36.decodeLine(samples, 0, {}, TEST_SAMPLE_RATE)
    const mid0 = 160 * 4 // 第 0 行中间像素
    expect(rgba[mid0]!).toBeGreaterThan(220)
    expect(rgba[mid0 + 1]!).toBeGreaterThan(220)
    expect(rgba[mid0 + 2]!).toBeGreaterThan(220)
    expect(rgba[mid0 + 3]).toBe(255)
    const mid1 = (320 + 160) * 4 // 第 1 行中间像素
    expect(rgba[mid1]!).toBeGreaterThan(220)
    expect(rgba[mid1 + 1]!).toBeGreaterThan(220)
    expect(rgba[mid1 + 2]!).toBeGreaterThan(220)
    expect(rgba[mid1 + 3]).toBe(255)
  })

  it('全黑 Y(Y=0, 中性色差 128)两行均接近黑色', () => {
    const samples = synthRobot36Pair(0, 128, 0, 128)
    const rgba = robot36.decodeLine(samples, 0, {}, TEST_SAMPLE_RATE)
    const mid0 = 160 * 4
    expect(rgba[mid0]!).toBeLessThan(40)
    expect(rgba[mid0 + 1]!).toBeLessThan(40)
    expect(rgba[mid0 + 2]!).toBeLessThan(40)
    const mid1 = (320 + 160) * 4
    expect(rgba[mid1]!).toBeLessThan(40)
    expect(rgba[mid1 + 1]!).toBeLessThan(40)
    expect(rgba[mid1 + 2]!).toBeLessThan(40)
  })
})
