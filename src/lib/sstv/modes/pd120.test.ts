// src/lib/sstv/modes/pd120.test.ts
import { describe, it, expect } from 'vitest'
import { pd120 } from './pd120'
import { synthTone, concat, brightnessToFreq, TEST_SAMPLE_RATE } from '../__tests__/fixtures'

function clamp(v: number): number {
  return Math.max(0, Math.min(255, v))
}

/**
 * 合成一个 PD120 scan line:
 * 20ms sync(1200Hz) + 2.08ms porch(1500Hz) + 121.6ms Y1 + 121.6ms Cr + 121.6ms Cb + 121.6ms Y2
 * Y2 = Y1(两行相同颜色)。
 */
function synthPD120ScanLine(r: number, g: number, b: number): Float32Array {
  // PD 用直接 R-Y / B-Y 编码(不像 JPEG 有 0.713/0.564 scale)
  const y = clamp(Math.round(0.299 * r + 0.587 * g + 0.114 * b))
  const cr = clamp(Math.round(128 + (r - y)))
  const cb = clamp(Math.round(128 + (b - y)))
  return concat(
    synthTone(1200, 20),
    synthTone(1500, 2.08),
    synthTone(brightnessToFreq(y), 121.6),
    synthTone(brightnessToFreq(cr), 121.6),
    synthTone(brightnessToFreq(cb), 121.6),
    synthTone(brightnessToFreq(y), 121.6) // Y2 = Y1
  )
}

describe('pd120', () => {
  it('基础参数正确', () => {
    expect(pd120.name).toBe('pd120')
    expect(pd120.visCode).toBe(0x5f)
    expect(pd120.width).toBe(640)
    expect(pd120.height).toBe(496)
    expect(pd120.rowsPerScanLine).toBe(2)
    expect(Math.abs(pd120.scanLineMs - 508.48)).toBeLessThan(1)
  })

  it('RGBA 长度 = width × 2 × 4(两行)', () => {
    const samples = synthPD120ScanLine(128, 128, 128)
    const rgba = pd120.decodeLine(samples, 0, {}, TEST_SAMPLE_RATE)
    expect(rgba.length).toBe(640 * 2 * 4)
  })

  it('纯灰行(R=G=B=128)两行像素 R/G/B 接近 128', () => {
    const samples = synthPD120ScanLine(128, 128, 128)
    const rgba = pd120.decodeLine(samples, 0, {}, TEST_SAMPLE_RATE)
    // 第 0 行中间像素
    const mid0 = 320 * 4
    expect(rgba[mid0]!).toBeGreaterThan(90)
    expect(rgba[mid0]!).toBeLessThan(165)
    expect(rgba[mid0 + 1]!).toBeGreaterThan(90)
    expect(rgba[mid0 + 1]!).toBeLessThan(165)
    expect(rgba[mid0 + 2]!).toBeGreaterThan(90)
    expect(rgba[mid0 + 2]!).toBeLessThan(165)
    // 第 1 行中间像素
    const mid1 = (640 + 320) * 4
    expect(rgba[mid1]!).toBeGreaterThan(90)
    expect(rgba[mid1 + 1]!).toBeGreaterThan(90)
    expect(rgba[mid1 + 2]!).toBeGreaterThan(90)
  })

  it('纯红行解出 R 高、G/B 低', () => {
    const samples = synthPD120ScanLine(255, 0, 0)
    const rgba = pd120.decodeLine(samples, 0, {}, TEST_SAMPLE_RATE)
    // 第 0 行中间像素
    const mid = 320 * 4
    expect(rgba[mid]!).toBeGreaterThan(180)    // R 应接近 255
    expect(rgba[mid + 1]!).toBeLessThan(80)    // G 应接近 0
    expect(rgba[mid + 2]!).toBeLessThan(80)    // B 应接近 0
  })
})
