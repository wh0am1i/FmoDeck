// src/lib/sstv/modes/scottie-s2.test.ts
import { describe, it, expect } from 'vitest'
import { scottieS2 } from './scottie-s2'
import { synthTone, concat, brightnessToFreq, TEST_SAMPLE_RATE } from '../__tests__/fixtures'

/** Scottie S2 行结构(sync 中段):sep + G + sep + B + sync + porch + R */
function synthScottieS2Line(r: number, g: number, b: number) {
  return concat(
    synthTone(1500, 1.5),
    synthTone(brightnessToFreq(g), 88.064),
    synthTone(1500, 1.5),
    synthTone(brightnessToFreq(b), 88.064),
    synthTone(1200, 9),
    synthTone(1500, 1.5),
    synthTone(brightnessToFreq(r), 88.064)
  )
}

describe('scottie-s2', () => {
  it('基础参数正确', () => {
    expect(scottieS2.name).toBe('scottie-s2')
    expect(scottieS2.visCode).toBe(0xb8)
    expect(scottieS2.width).toBe(320)
    expect(scottieS2.height).toBe(256)
    expect(scottieS2.preludeMs).toBe(9)
    expect(Math.abs(scottieS2.scanLineMs - 277.692)).toBeLessThan(0.5)
  })

  it('纯红行解出 R 高、G/B 低', () => {
    const rgba = scottieS2.decodeLine(synthScottieS2Line(255, 0, 0), 0, {}, TEST_SAMPLE_RATE)
    const mid = 160 * 4
    expect(rgba[mid]!).toBeGreaterThan(220)
    expect(rgba[mid + 1]!).toBeLessThan(40)
    expect(rgba[mid + 2]!).toBeLessThan(40)
  })

  it('纯绿行解出 G 高', () => {
    const rgba = scottieS2.decodeLine(synthScottieS2Line(0, 255, 0), 0, {}, TEST_SAMPLE_RATE)
    const mid = 160 * 4
    expect(rgba[mid + 1]!).toBeGreaterThan(220)
  })

  it('纯蓝行解出 B 高', () => {
    const rgba = scottieS2.decodeLine(synthScottieS2Line(0, 0, 255), 0, {}, TEST_SAMPLE_RATE)
    const mid = 160 * 4
    expect(rgba[mid + 2]!).toBeGreaterThan(220)
  })
})
