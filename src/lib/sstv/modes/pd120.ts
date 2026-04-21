// src/lib/sstv/modes/pd120.ts
import type { Mode } from './types'
import { freqToBrightness, instantFreq, toAnalytic } from '../dsp'

// PD120 规范:一个 scan line 产 2 个 image row
const SYNC_MS = 20
const PORCH_MS = 2.08
const Y_MS = 121.6
const SCAN_LINE_MS = SYNC_MS + PORCH_MS + Y_MS * 4 // 508.48

const WIDTH = 640
const HEIGHT = 496

/**
 * FM 瞬时频率解调:在 [startMs, endMs] 时段内,把 `freq` 数组按 count 个等间距像素
 * 切片,每个像素取对应小窗的均值映射到亮度。
 */
function sampleSection(
  freq: Float32Array,
  sampleRate: number,
  startMs: number,
  endMs: number,
  count: number
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(count)
  const perPixelMs = (endMs - startMs) / count
  const perPixelSamples = Math.max(1, Math.round((perPixelMs * sampleRate) / 1000))
  const windowSamples = Math.max(4, perPixelSamples)
  for (let i = 0; i < count; i++) {
    const centerMs = startMs + perPixelMs * (i + 0.5)
    const centerIdx = Math.round((centerMs * sampleRate) / 1000)
    const startIdx = Math.max(0, centerIdx - Math.floor(windowSamples / 2))
    const end = Math.min(freq.length, startIdx + windowSamples)
    if (end <= startIdx) {
      out[i] = 0
      continue
    }
    let sum = 0
    for (let k = startIdx; k < end; k++) sum += freq[k] ?? 0
    out[i] = freqToBrightness(sum / (end - startIdx))
  }
  return out
}

/**
 * PD 专用 YCbCr → RGB:PD 直接编码 R-Y / B-Y(未做 JPEG 的 0.713/0.564 缩放),
 * 所以解码时系数是 1.0,不是 Robot/Martin 的 1.402/1.772。
 * 否则 Cr/Cb 会被过度放大,皮肤变粉/品红。
 *
 * 推导:已知 Y = 0.299R + 0.587G + 0.114B,R = Y + (Cr-128),B = Y + (Cb-128)
 *       则 G = Y - 0.509(Cr-128) - 0.194(Cb-128)
 */
function yuvToRgb(y: number, cb: number, cr: number): [number, number, number] {
  const cbb = cb - 128
  const crr = cr - 128
  const r = y + crr
  const g = y - 0.509 * crr - 0.194 * cbb
  const b = y + cbb
  return [clamp(r), clamp(g), clamp(b)]
}

function clamp(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)))
}

/**
 * 在本行前 25ms 内检测 1200Hz sync pulse 的实际中心位置(ms)。
 * PD120 sync 宽 20ms,比 Robot/Martin 宽。
 * 返回 { raw: 原始偏移量(ms), clamped: 钳制后偏移量(ms) }。
 * 找不到 sync 时两者均为 0。
 */
function detectSyncOffsetMs(
  freq: Float32Array,
  sampleRate: number
): { raw: number; clamped: number } {
  const searchMs = 25
  const syncWidthMs = SYNC_MS
  const searchSamples = Math.min(
    freq.length,
    Math.round((searchMs * sampleRate) / 1000)
  )
  const winSamples = Math.max(4, Math.round((syncWidthMs * sampleRate) / 1000))
  if (searchSamples < winSamples + 4) return { raw: 0, clamped: 0 }

  let bestCenterIdx = winSamples / 2
  let bestDist = Infinity
  let sum = 0
  for (let k = 0; k < winSamples; k++) sum += freq[k] ?? 0

  for (let start = 0; start + winSamples <= searchSamples; start++) {
    const mean = sum / winSamples
    const dist = Math.abs(mean - 1200)
    if (dist < bestDist) {
      bestDist = dist
      bestCenterIdx = start + winSamples / 2
    }
    if (start + winSamples < searchSamples) {
      sum += (freq[start + winSamples] ?? 0) - (freq[start] ?? 0)
    }
  }

  if (bestDist > 200) return { raw: 0, clamped: 0 }

  const detectedMs = (bestCenterIdx / sampleRate) * 1000
  const expectedMs = SYNC_MS / 2 // 10ms
  const offsetMs = detectedMs - expectedMs

  // 钳制到 ±5ms
  const clamped = Math.abs(offsetMs) > 5 ? 0 : offsetMs
  return { raw: offsetMs, clamped }
}

/**
 * PD120:每个 scan line 508.48ms,产生 2 个 image row。
 * 结构:sync(20ms) + porch(2.08ms) + Y1(121.6ms) + Cr(121.6ms) + Cb(121.6ms) + Y2(121.6ms)
 * 两个 image row 共享同一组 Cr/Cb。
 *
 * VIS 码 on-wire: 0x5F(7-bit 1011111,popcount=6 偶,parity=0)
 */
export const pd120: Mode = {
  name: 'pd120',
  displayName: 'PD 120',
  visCode: 0x5f,
  width: WIDTH,
  height: HEIGHT,
  rowsPerScanLine: 2,
  scanLineMs: SCAN_LINE_MS,

  decodeLine(samples, _scanLineIndex, state, sampleRate): Uint8ClampedArray {
    const { i, q } = toAnalytic(samples, sampleRate)
    const freq = instantFreq(i, q, sampleRate)

    // per-line sync 矫正:sync pulse 宽 20ms,在前 25ms 内找
    const sync = detectSyncOffsetMs(freq, sampleRate)
    const syncOffset = sync.clamped
    // 把 raw 写入 state 供 decoder 做斜率校正使用
    ;(state as { lastRawSyncMs?: number }).lastRawSyncMs = sync.raw

    const y1Start = SYNC_MS + PORCH_MS + syncOffset
    const crStart = y1Start + Y_MS
    const cbStart = crStart + Y_MS
    const y2Start = cbStart + Y_MS

    const y1 = sampleSection(freq, sampleRate, y1Start, y1Start + Y_MS, WIDTH)
    const cr = sampleSection(freq, sampleRate, crStart, crStart + Y_MS, WIDTH)
    const cb = sampleSection(freq, sampleRate, cbStart, cbStart + Y_MS, WIDTH)
    const y2 = sampleSection(freq, sampleRate, y2Start, y2Start + Y_MS, WIDTH)

    // 两行共用 Cr/Cb。用 Rec.601 full-range YCbCr → RGB
    const rgba = new Uint8ClampedArray(WIDTH * 2 * 4)
    for (let x = 0; x < WIDTH; x++) {
      const [r1, g1, b1] = yuvToRgb(y1[x]!, cb[x]!, cr[x]!)
      const [r2, g2, b2] = yuvToRgb(y2[x]!, cb[x]!, cr[x]!)
      // 第 0 行
      rgba[x * 4 + 0] = r1
      rgba[x * 4 + 1] = g1
      rgba[x * 4 + 2] = b1
      rgba[x * 4 + 3] = 255
      // 第 1 行
      rgba[(WIDTH + x) * 4 + 0] = r2
      rgba[(WIDTH + x) * 4 + 1] = g2
      rgba[(WIDTH + x) * 4 + 2] = b2
      rgba[(WIDTH + x) * 4 + 3] = 255
    }
    return rgba
  }
}
