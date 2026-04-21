// src/lib/sstv/modes/pd120.ts
import type { Mode } from './types'
import { instantFreq, toAnalytic } from '../dsp'
import { sampleBrightnessSection } from './sample-section'

// PD120 规范:一个 scan line 产 2 个 image row
const SYNC_MS = 20
const PORCH_MS = 2.08
const Y_MS = 121.6
const SCAN_LINE_MS = SYNC_MS + PORCH_MS + Y_MS * 4 // 508.48

const WIDTH = 640
const HEIGHT = 496

/** YCbCr(full-range / JPEG-style,SSTV 通用)→ RGB。Y/Cb/Cr 都是 0-255。 */
function yuvToRgb(y: number, cb: number, cr: number): [number, number, number] {
  const cbb = cb - 128
  const crr = cr - 128
  const r = y + 1.402 * crr
  const g = y - 0.344136 * cbb - 0.714136 * crr
  const b = y + 1.772 * cbb
  return [clamp(r), clamp(g), clamp(b)]
}

function clamp(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)))
}

const CLAMP_MS = 25

/**
 * 在本行前 35ms 内检测 1200Hz sync pulse 的实际中心位置(ms)。
 * PD120 sync 宽 20ms,比 Robot/Martin 宽;搜索窗口也相应更大。
 * 返回 { raw: 未钳制偏移, clamped: 钳制后偏移 }。
 * 找不到 sync(bestDist > 200)时两者均返回 0。
 */
function detectSyncOffsetMsInternal(
  freq: Float32Array,
  sampleRate: number
): { raw: number; clamped: number } {
  const searchMs = 55 // sync 20ms + 大余量(给未校准期的累积漂移留空间)
  const syncWidthMs = SYNC_MS
  const searchSamples = Math.min(
    freq.length,
    Math.round((searchMs * sampleRate) / 1000)
  )
  const winSamples = Math.max(4, Math.round((syncWidthMs * sampleRate) / 1000))
  if (searchSamples < winSamples + 4) return { raw: NaN, clamped: 0 }

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

  if (bestDist > 200) return { raw: NaN, clamped: 0 }

  const detectedMs = (bestCenterIdx / sampleRate) * 1000
  const expectedMs = SYNC_MS / 2 // 10ms
  const raw = detectedMs - expectedMs
  const clamped = Math.abs(raw) > CLAMP_MS ? 0 : raw
  return { raw, clamped }
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

    // per-line sync 矫正:sync pulse 宽 20ms,在前 35ms 内找
    const { raw: rawSync, clamped: syncRaw } = detectSyncOffsetMsInternal(freq, sampleRate)
    const st = state as { lastRawSyncMs?: number; syncWindow?: number[] }
    st.lastRawSyncMs = rawSync

    // 中位数滤波:抑制单 scan line sync 检测抖动(避免行间水平错位)
    st.syncWindow ??= []
    st.syncWindow.push(syncRaw)
    if (st.syncWindow.length > 5) st.syncWindow.shift()
    const sorted = [...st.syncWindow].sort((a, b) => a - b)
    const syncOffset = sorted[Math.floor(sorted.length / 2)]!

    const y1Start = SYNC_MS + PORCH_MS + syncOffset
    const crStart = y1Start + Y_MS
    const cbStart = crStart + Y_MS
    const y2Start = cbStart + Y_MS

    const y1 = sampleBrightnessSection(freq, sampleRate, y1Start, y1Start + Y_MS, WIDTH)
    const cr = sampleBrightnessSection(freq, sampleRate, crStart, crStart + Y_MS, WIDTH)
    const cb = sampleBrightnessSection(freq, sampleRate, cbStart, cbStart + Y_MS, WIDTH)
    const y2 = sampleBrightnessSection(freq, sampleRate, y2Start, y2Start + Y_MS, WIDTH)

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
