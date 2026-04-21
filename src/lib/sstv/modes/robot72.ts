// src/lib/sstv/modes/robot72.ts
import type { Mode } from './types'
import { freqToBrightness, instantFreq, toAnalytic } from '../dsp'

// 各段耗时(ms),和 Robot 72 规范一致
const SYNC_MS = 9
const PORCH1_MS = 3
const Y_MS = 138
const SEPARATOR_MS = 4.5
const PORCH2_MS = 1.5
const CHROMA_MS = 138
const SCAN_LINE_MS = SYNC_MS + PORCH1_MS + Y_MS + SEPARATOR_MS + PORCH2_MS + CHROMA_MS // 294

const WIDTH = 320
const CHROMA_WIDTH = 320 // 全宽色差(与 Robot36 不同,非 4:2:0 减半)

/**
 * FM 瞬时频率解调:在 [startMs, endMs] 时段内,把 `freq` 数组按 count 个等间距像素
 * 切片,每个像素取对应小窗(2× 像素宽,最低 4 样本)的均值映射到亮度。
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

/**
 * 在本行前 20ms 内检测 1200Hz sync pulse 的实际中心位置(ms)。
 * 返回相对理论 sync 中心(4.5ms)的偏移量(ms);找不到或偏移太大时返回 0。
 */
function detectSyncOffsetMs(freq: Float32Array, sampleRate: number): number {
  const searchMs = 20
  const syncWidthMs = SYNC_MS
  const searchSamples = Math.min(
    freq.length,
    Math.round((searchMs * sampleRate) / 1000)
  )
  const winSamples = Math.max(4, Math.round((syncWidthMs * sampleRate) / 1000))
  if (searchSamples < winSamples + 4) return 0

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

  if (bestDist > 200) return 0

  const detectedMs = (bestCenterIdx / sampleRate) * 1000
  const expectedMs = SYNC_MS / 2 // 4.5ms
  const offsetMs = detectedMs - expectedMs

  if (Math.abs(offsetMs) > 3) return 0
  return offsetMs
}

/**
 * Robot72:每行 294ms,每行携带 Y + 一个全宽色差(偶行 R-Y,奇行 B-Y)。
 * 相邻两行共享色差:输出 RGBA 时,每两行用同一组 Cr/Cb。
 * 与 Robot36 的核心区别:色差为全宽 320 像素(非 4:2:0 减半的 160)。
 *
 * VIS 码 on-wire: 0x0C(7-bit 0x0C = 0001100,popcount=2 偶,parity=0)
 */
export const robot72: Mode = {
  name: 'robot72',
  displayName: 'Robot 72',
  visCode: 0x0c,
  width: WIDTH,
  height: 240,
  rowsPerScanLine: 1,
  scanLineMs: SCAN_LINE_MS,

  decodeLine(samples, scanLineIndex, state, sampleRate): Uint8ClampedArray {
    const row = scanLineIndex

    // 整行一次 FM 解调
    const { i, q } = toAnalytic(samples, sampleRate)
    const freq = instantFreq(i, q, sampleRate)

    // 逐行 sync 矫正
    const syncOffset = detectSyncOffsetMs(freq, sampleRate)

    const yStart = SYNC_MS + PORCH1_MS + syncOffset
    const yEnd = yStart + Y_MS
    const chromaStart = yEnd + SEPARATOR_MS + PORCH2_MS
    const chromaEnd = chromaStart + CHROMA_MS

    const yLine = sampleSection(freq, sampleRate, yStart, yEnd, WIDTH)
    const chroma = sampleSection(freq, sampleRate, chromaStart, chromaEnd, CHROMA_WIDTH)

    // 跨行状态:偶行存 Cr,奇行存 Cb
    const s = state as { cr?: Uint8ClampedArray; cb?: Uint8ClampedArray }
    if (row % 2 === 0) {
      s.cr = chroma
    } else {
      s.cb = chroma
    }
    const cr = s.cr ?? new Uint8ClampedArray(CHROMA_WIDTH).fill(128)
    const cb = s.cb ?? new Uint8ClampedArray(CHROMA_WIDTH).fill(128)

    const rgba = new Uint8ClampedArray(WIDTH * 4)
    for (let x = 0; x < WIDTH; x++) {
      // 全宽色差:直接用 x 索引(不像 Robot36 用 x>>1)
      const [r, g, b] = yuvToRgb(yLine[x]!, cb[x] ?? 128, cr[x] ?? 128)
      rgba[x * 4 + 0] = r
      rgba[x * 4 + 1] = g
      rgba[x * 4 + 2] = b
      rgba[x * 4 + 3] = 255
    }
    return rgba
  }
}
