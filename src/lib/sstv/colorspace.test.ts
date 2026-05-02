import { describe, expect, it } from 'vitest'
import { ycbcrToRgb } from './colorspace'

/**
 * JPEG/JFIF YCbCr → RGB 的反向参考(用于 roundtrip 验证):
 *   Y  =  0.299·R + 0.587·G + 0.114·B
 *   Cb = -0.168736·R - 0.331264·G + 0.5·B + 128
 *   Cr =  0.5·R - 0.418688·G - 0.081312·B + 128
 */
function rgbToYcbcr(r: number, g: number, b: number): [number, number, number] {
  const y = 0.299 * r + 0.587 * g + 0.114 * b
  const cb = -0.168736 * r - 0.331264 * g + 0.5 * b + 128
  const cr = 0.5 * r - 0.418688 * g - 0.081312 * b + 128
  return [y, cb, cr]
}

describe('colorspace / ycbcrToRgb', () => {
  it('Y=128 Cb=128 Cr=128 → 灰', () => {
    const [r, g, b] = ycbcrToRgb(128, 128, 128)
    expect(r).toBe(128)
    expect(g).toBe(128)
    expect(b).toBe(128)
  })

  it('Y=255 Cb=128 Cr=128 → 白', () => {
    expect(ycbcrToRgb(255, 128, 128)).toEqual([255, 255, 255])
  })

  it('Y=0 Cb=128 Cr=128 → 黑', () => {
    expect(ycbcrToRgb(0, 128, 128)).toEqual([0, 0, 0])
  })

  // Roundtrip:RGB → YCbCr → RGB 在所有饱和度颜色上误差 ≤1(round 截断)
  for (const [name, r, g, b] of [
    ['纯红', 255, 0, 0],
    ['纯绿', 0, 255, 0],
    ['纯蓝', 0, 0, 255],
    ['黄', 255, 255, 0],
    ['品红', 255, 0, 255],
    ['青', 0, 255, 255],
    ['中灰', 128, 128, 128],
    ['橙红', 230, 80, 30],
    ['深绿', 20, 100, 40]
  ] as const) {
    it(`${name} (${r},${g},${b}) roundtrip 误差 ≤1`, () => {
      const [y, cb, cr] = rgbToYcbcr(r, g, b)
      const [r2, g2, b2] = ycbcrToRgb(Math.round(y), Math.round(cb), Math.round(cr))
      expect(Math.abs(r2 - r)).toBeLessThanOrEqual(2)
      expect(Math.abs(g2 - g)).toBeLessThanOrEqual(2)
      expect(Math.abs(b2 - b)).toBeLessThanOrEqual(2)
    })
  }
})
