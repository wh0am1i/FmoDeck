// src/lib/sstv/modes/robot72.test.ts
import { describe, it, expect } from 'vitest'
import { robot72 } from './robot72'
import { synthTone, concat, brightnessToFreq, TEST_SAMPLE_RATE } from '../__tests__/fixtures'

/**
 * 构造一行 Robot72 信号:
 * 9ms sync + 3ms porch + 138ms Y + 4.5ms separator(1500)
 * + 1.5ms porch(1900) + 69ms R-Y + 4.5ms separator(2300)
 * + 1.5ms porch(1500) + 69ms B-Y。
 */
function synthRobot72Line(yValue: number, ryValue: number, byValue: number) {
  return concat(
    synthTone(1200, 9),
    synthTone(1500, 3),
    synthTone(brightnessToFreq(yValue), 138),
    synthTone(1500, 4.5),
    synthTone(1900, 1.5),
    synthTone(brightnessToFreq(ryValue), 69),
    synthTone(2300, 4.5),
    synthTone(1500, 1.5),
    synthTone(brightnessToFreq(byValue), 69)
  )
}

describe('robot72', () => {
  it('基础参数正确', () => {
    expect(robot72.name).toBe('robot72')
    expect(robot72.visCode).toBe(0x0c)
    expect(robot72.width).toBe(320)
    expect(robot72.height).toBe(240)
    expect(robot72.rowsPerScanLine).toBe(1)
    expect(Math.abs(robot72.scanLineMs - 300)).toBeLessThan(1)
  })

  it('全白 Y 解码后中间像素 R/G/B 都接近 255', () => {
    const line = synthRobot72Line(255, 128, 128)
    const rgba = robot72.decodeLine(line, 0, {}, TEST_SAMPLE_RATE)
    const mid = 160 * 4 // 中间像素
    const tail = 319 * 4 // 最右像素不应混入后面的 separator/porch
    // YCrCb → RGB,Y=255, Cr=Cb=128 → R≈G≈B≈255
    expect(rgba[mid]!).toBeGreaterThan(220)
    expect(rgba[mid + 1]!).toBeGreaterThan(220)
    expect(rgba[mid + 2]!).toBeGreaterThan(220)
    expect(rgba[mid + 3]).toBe(255)
    expect(rgba[tail]!).toBeGreaterThan(220)
    expect(rgba[tail + 1]!).toBeGreaterThan(220)
    expect(rgba[tail + 2]!).toBeGreaterThan(220)
  })

  it('全黑 Y 解码后中间像素 R/G/B 都接近 0', () => {
    const line = synthRobot72Line(0, 128, 128)
    const rgba = robot72.decodeLine(line, 0, {}, TEST_SAMPLE_RATE)
    const mid = 160 * 4
    expect(rgba[mid]!).toBeLessThan(40)
    expect(rgba[mid + 1]!).toBeLessThan(40)
    expect(rgba[mid + 2]!).toBeLessThan(40)
  })

  it('RGBA 长度 = width × 4', () => {
    const line = synthRobot72Line(128, 128, 128)
    const rgba = robot72.decodeLine(line, 0, {}, TEST_SAMPLE_RATE)
    expect(rgba.length).toBe(320 * 4)
  })

  it('把 raw sync 偏移写入 state,供 decoder 做 slant 校准', () => {
    const delayedSyncLine = concat(
      synthTone(1900, 2),
      synthRobot72Line(128, 128, 128)
    )
    const state: { lastRawSyncMs?: number } = {}

    robot72.decodeLine(delayedSyncLine, 0, state, TEST_SAMPLE_RATE)

    expect(state.lastRawSyncMs).toBeGreaterThan(0.5)
    expect(state.lastRawSyncMs).toBeLessThan(3.5)
  })

  it('纯红行解出 R 高而 G/B 低', () => {
    const line = synthRobot72Line(76, 255, 84)
    const rgba = robot72.decodeLine(line, 0, {}, TEST_SAMPLE_RATE)
    const mid = 160 * 4
    const tail = 319 * 4
    expect(rgba[mid]!).toBeGreaterThan(200)
    expect(rgba[mid + 1]!).toBeLessThan(90)
    expect(rgba[mid + 2]!).toBeLessThan(90)
    expect(rgba[tail]!).toBeGreaterThan(180)
    expect(rgba[tail + 1]!).toBeLessThan(110)
    expect(rgba[tail + 2]!).toBeLessThan(110)
  })
})
