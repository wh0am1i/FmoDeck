// src/lib/sstv/modes/martin-m2.test.ts
import { describe, it, expect } from 'vitest'
import { martinM2 } from './martin-m2'
import { synthTone, concat, brightnessToFreq, TEST_SAMPLE_RATE } from '../__tests__/fixtures'

function synthMartinM2Line(r: number, g: number, b: number) {
  return concat(
    synthTone(1200, 4.862),
    synthTone(1500, 0.572),
    synthTone(brightnessToFreq(g), 73.216),
    synthTone(1500, 0.572),
    synthTone(brightnessToFreq(b), 73.216),
    synthTone(1500, 0.572),
    synthTone(brightnessToFreq(r), 73.216),
    synthTone(1500, 0.572)
  )
}

describe('martin-m2', () => {
  it('基础参数正确', () => {
    expect(martinM2.name).toBe('martin-m2')
    expect(martinM2.visCode).toBe(0x28)
    expect(martinM2.width).toBe(320)
    expect(martinM2.height).toBe(256)
    expect(Math.abs(martinM2.lineMs - 226.798)).toBeLessThan(0.5)
  })

  it('纯红行解出 R 高', () => {
    const rgba = martinM2.decodeLine(synthMartinM2Line(255, 0, 0), 0, {}, TEST_SAMPLE_RATE)
    const mid = 160 * 4
    expect(rgba[mid]!).toBeGreaterThan(220)
    expect(rgba[mid + 1]!).toBeLessThan(40)
    expect(rgba[mid + 2]!).toBeLessThan(40)
  })

  it('纯蓝行解出 B 高', () => {
    const rgba = martinM2.decodeLine(synthMartinM2Line(0, 0, 255), 0, {}, TEST_SAMPLE_RATE)
    const mid = 160 * 4
    expect(rgba[mid + 2]!).toBeGreaterThan(220)
  })
})
