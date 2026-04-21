// src/lib/sstv/modes/robot72.test.ts
import { describe, it, expect } from 'vitest'
import { robot72 } from './robot72'
import { synthTone, concat, brightnessToFreq, TEST_SAMPLE_RATE } from '../__tests__/fixtures'

/**
 * 构造一行 Robot72 信号(9ms sync + 3ms porch + 138ms Y + 4.5ms separator + 1.5ms porch + 138ms chroma)。
 * 偶行 separator=2300Hz(Cr),奇行 separator=1500Hz(Cb)。
 */
function synthRobot72Line(yValue: number, chromaValue: number, row: number) {
  const separatorHz = row % 2 === 0 ? 2300 : 1500
  return concat(
    synthTone(1200, 9),
    synthTone(1500, 3),
    synthTone(brightnessToFreq(yValue), 138),
    synthTone(separatorHz, 4.5),
    synthTone(1900, 1.5),
    synthTone(brightnessToFreq(chromaValue), 138)
  )
}

describe('robot72', () => {
  it('基础参数正确', () => {
    expect(robot72.name).toBe('robot72')
    expect(robot72.visCode).toBe(0x0c)
    expect(robot72.width).toBe(320)
    expect(robot72.height).toBe(240)
    expect(robot72.rowsPerScanLine).toBe(1)
    expect(Math.abs(robot72.scanLineMs - 294)).toBeLessThan(1)
  })

  it('全白 Y 解码后中间像素 R/G/B 都接近 255', () => {
    const line = synthRobot72Line(255, 128, 0)
    const rgba = robot72.decodeLine(line, 0, {}, TEST_SAMPLE_RATE)
    const mid = 160 * 4 // 中间像素
    // YCrCb → RGB,Y=255, Cr=Cb=128 → R≈G≈B≈255
    expect(rgba[mid]!).toBeGreaterThan(220)
    expect(rgba[mid + 1]!).toBeGreaterThan(220)
    expect(rgba[mid + 2]!).toBeGreaterThan(220)
    expect(rgba[mid + 3]).toBe(255)
  })

  it('全黑 Y 解码后中间像素 R/G/B 都接近 0', () => {
    const line = synthRobot72Line(0, 128, 0)
    const rgba = robot72.decodeLine(line, 0, {}, TEST_SAMPLE_RATE)
    const mid = 160 * 4
    expect(rgba[mid]!).toBeLessThan(40)
    expect(rgba[mid + 1]!).toBeLessThan(40)
    expect(rgba[mid + 2]!).toBeLessThan(40)
  })

  it('RGBA 长度 = width × 4', () => {
    const line = synthRobot72Line(128, 128, 0)
    const rgba = robot72.decodeLine(line, 0, {}, TEST_SAMPLE_RATE)
    expect(rgba.length).toBe(320 * 4)
  })
})
