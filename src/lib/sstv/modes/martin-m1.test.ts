// src/lib/sstv/modes/martin-m1.test.ts
import { describe, it, expect } from 'vitest'
import { martinM1 } from './martin-m1'
import { synthTone, concat, brightnessToFreq, TEST_SAMPLE_RATE } from '../__tests__/fixtures'

/** Martin M1 时段:4.862 sync + 0.572 porch + 146.432 G + 0.572 sep + 146.432 B + 0.572 sep + 146.432 R + 0.572 sep */
function synthMartinM1Line(r: number, g: number, b: number) {
  return concat(
    synthTone(1200, 4.862),
    synthTone(1500, 0.572),
    synthTone(brightnessToFreq(g), 146.432),
    synthTone(1500, 0.572),
    synthTone(brightnessToFreq(b), 146.432),
    synthTone(1500, 0.572),
    synthTone(brightnessToFreq(r), 146.432),
    synthTone(1500, 0.572)
  )
}

describe('martin-m1', () => {
  it('基础参数正确', () => {
    expect(martinM1.name).toBe('martin-m1')
    expect(martinM1.visCode).toBe(0xac)
    expect(martinM1.width).toBe(320)
    expect(martinM1.height).toBe(256)
    expect(Math.abs(martinM1.lineMs - 446.446)).toBeLessThan(0.5)
  })

  it('纯红(R=255, G=0, B=0)行中间像素解出 R 高、G/B 低', () => {
    const line = synthMartinM1Line(255, 0, 0)
    const rgba = martinM1.decodeLine(line, 0, {}, TEST_SAMPLE_RATE)
    const mid = 160 * 4
    expect(rgba[mid]!).toBeGreaterThan(220)
    expect(rgba[mid + 1]!).toBeLessThan(40)
    expect(rgba[mid + 2]!).toBeLessThan(40)
  })

  it('纯绿行解出 G 高', () => {
    const line = synthMartinM1Line(0, 255, 0)
    const rgba = martinM1.decodeLine(line, 0, {}, TEST_SAMPLE_RATE)
    const mid = 160 * 4
    expect(rgba[mid]!).toBeLessThan(40)
    expect(rgba[mid + 1]!).toBeGreaterThan(220)
    expect(rgba[mid + 2]!).toBeLessThan(40)
  })

  it('纯蓝行解出 B 高', () => {
    const line = synthMartinM1Line(0, 0, 255)
    const rgba = martinM1.decodeLine(line, 0, {}, TEST_SAMPLE_RATE)
    const mid = 160 * 4
    expect(rgba[mid]!).toBeLessThan(40)
    expect(rgba[mid + 1]!).toBeLessThan(40)
    expect(rgba[mid + 2]!).toBeGreaterThan(220)
  })
})
