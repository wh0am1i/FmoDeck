// src/lib/sstv/colorspace.ts

/**
 * SSTV 色彩空间统一约定:**BT.601 full-range (JPEG / JFIF)**
 *
 * - 频率 ↔ 字节:1500 Hz = 0,2300 Hz = 255,线性
 * - YCbCr 字节 → RGB:JPEG/JFIF 标准矩阵(Y / Cb / Cr 都是 0..255)
 *
 *     R = Y + 1.402  · (Cr - 128)
 *     G = Y - 0.344136·(Cb - 128) - 0.714136·(Cr - 128)
 *     B = Y + 1.772  · (Cb - 128)
 *
 * 说明:
 *   `Rec.601 full-range`、`JFIF YCbCr`、`JPEG YCbCr` 在不同文献里都指同一回事;
 *   slowrx / qsstv / MMSSTV 编解码侧实质都是这套系数。和"BT.601 limited-range"
 *   (Y∈[16,235], C∈[16,240]) 不同 —— 后者主要用于视频广播,SSTV 不用。
 *
 *   返回值经过 `Math.round` 截断到 [0,255] uint8。
 */
export function ycbcrToRgb(y: number, cb: number, cr: number): [number, number, number] {
  const cbb = cb - 128
  const crr = cr - 128
  const r = y + 1.402 * crr
  const g = y - 0.344136 * cbb - 0.714136 * crr
  const b = y + 1.772 * cbb
  return [clampByte(r), clampByte(g), clampByte(b)]
}

export function clampByte(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)))
}
