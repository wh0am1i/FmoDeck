// src/lib/sstv/modes/scottie-s1.test.ts
import { describe, it, expect } from 'vitest'
import { scottieS1 } from './scottie-s1'
import { synthTone, concat, brightnessToFreq, TEST_SAMPLE_RATE } from '../__tests__/fixtures'

/**
 * Scottie S1 行结构(Convention B,sync 在中段):
 *   sep(1.5) + G(138.24) + sep(1.5) + B(138.24) + sync(9) + porch(1.5) + R(138.24)
 */
function synthScottieS1Line(r: number, g: number, b: number) {
  return concat(
    synthTone(1500, 1.5),
    synthTone(brightnessToFreq(g), 138.24),
    synthTone(1500, 1.5),
    synthTone(brightnessToFreq(b), 138.24),
    synthTone(1200, 9),
    synthTone(1500, 1.5),
    synthTone(brightnessToFreq(r), 138.24)
  )
}

describe('scottie-s1', () => {
  it('基础参数正确', () => {
    expect(scottieS1.name).toBe('scottie-s1')
    expect(scottieS1.visCode).toBe(0x3c)
    expect(scottieS1.width).toBe(320)
    expect(scottieS1.height).toBe(256)
    expect(scottieS1.preludeMs).toBe(9)
    expect(Math.abs(scottieS1.scanLineMs - 428.22)).toBeLessThan(0.5)
  })

  it('纯红行解出 R 高、G/B 低', () => {
    const rgba = scottieS1.decodeLine(synthScottieS1Line(255, 0, 0), 0, {}, TEST_SAMPLE_RATE)
    const mid = 160 * 4
    expect(rgba[mid]!).toBeGreaterThan(220)
    expect(rgba[mid + 1]!).toBeLessThan(40)
    expect(rgba[mid + 2]!).toBeLessThan(40)
  })

  it('纯绿行解出 G 高', () => {
    const rgba = scottieS1.decodeLine(synthScottieS1Line(0, 255, 0), 0, {}, TEST_SAMPLE_RATE)
    const mid = 160 * 4
    expect(rgba[mid]!).toBeLessThan(40)
    expect(rgba[mid + 1]!).toBeGreaterThan(220)
    expect(rgba[mid + 2]!).toBeLessThan(40)
  })

  it('纯蓝行解出 B 高', () => {
    const rgba = scottieS1.decodeLine(synthScottieS1Line(0, 0, 255), 0, {}, TEST_SAMPLE_RATE)
    const mid = 160 * 4
    expect(rgba[mid]!).toBeLessThan(40)
    expect(rgba[mid + 1]!).toBeLessThan(40)
    expect(rgba[mid + 2]!).toBeGreaterThan(220)
  })
})
