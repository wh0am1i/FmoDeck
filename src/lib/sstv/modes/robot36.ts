// src/lib/sstv/modes/robot36.ts
import type { Mode } from './types'
import { freqToBrightness, instantFreq, toAnalytic } from '../dsp'

// 各段耗时(ms),和规范一致
const SYNC_MS = 9
const PORCH1_MS = 3
const Y_MS = 88
const SEPARATOR_MS = 4.5
const PORCH2_MS = 1.5
const CHROMA_MS = 44
const LINE_MS = SYNC_MS + PORCH1_MS + Y_MS + SEPARATOR_MS + PORCH2_MS + CHROMA_MS // 150

const WIDTH = 320
const CHROMA_WIDTH = 160 // 4:2:0 色差宽度减半

/**
 * FM 瞬时频率解调:在 [startMs, endMs] 时段内,把 `freq` 数组按 count 个等间距像素
 * 切片,每个像素取对应小窗(2× 像素宽,最低 4 样本)的均值映射到亮度。
 *
 * 不再需要 Goertzel 窗口保底,因为 instantFreq 已经是 sample-level 精度,
 * 小窗平均只是为了抑制噪声,不影响频率准确性。
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
  const windowSamples = Math.max(4, perPixelSamples) // 小窗平均,抑制样本级噪声
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
 *
 * 算法:滑动一个 9ms 宽的窗口,找窗口内 freq 均值最接近 1200Hz 的位置。
 * 钳制到 ±3ms(避免噪声导致的离谱偏移把整行搞坏)。
 */
function detectSyncOffsetMs(freq: Float32Array, sampleRate: number): number {
  const searchMs = 20 // 在前 20ms 内搜
  const syncWidthMs = SYNC_MS // 9ms sync 宽度
  const searchSamples = Math.min(
    freq.length,
    Math.round((searchMs * sampleRate) / 1000)
  )
  const winSamples = Math.max(4, Math.round((syncWidthMs * sampleRate) / 1000))
  if (searchSamples < winSamples + 4) return 0

  // 滑动 1 样本一步,找窗口内 freq 均值最接近 1200 的位置
  let bestCenterIdx = winSamples / 2
  let bestDist = Infinity
  // 初始化窗口和
  let sum = 0
  for (let k = 0; k < winSamples; k++) sum += freq[k] ?? 0

  for (let start = 0; start + winSamples <= searchSamples; start++) {
    const mean = sum / winSamples
    const dist = Math.abs(mean - 1200)
    if (dist < bestDist) {
      bestDist = dist
      bestCenterIdx = start + winSamples / 2
    }
    // 滑窗:滚动加下一个、减最旧的
    if (start + winSamples < searchSamples) {
      sum += (freq[start + winSamples] ?? 0) - (freq[start] ?? 0)
    }
  }

  // 如果最佳窗口均值距离 1200Hz 仍然很远(>200Hz),说明没找到 sync → 不矫正
  if (bestDist > 200) return 0

  const detectedMs = (bestCenterIdx / sampleRate) * 1000
  const expectedMs = SYNC_MS / 2 // 4.5ms
  const offsetMs = detectedMs - expectedMs

  // 钳制到 ±3ms;超出视为误判,不矫正
  if (Math.abs(offsetMs) > 3) return 0
  return offsetMs
}

/**
 * Robot36:每行 150ms,每行携带 Y + 一个色差(偶行 R-Y,奇行 B-Y)。
 * 相邻两行共享色差:输出 RGBA 时,每两行用同一组 Cr/Cb(4:2:0)。
 *
 * 解调链:samples → FM 相位解调(toAnalytic + instantFreq)→ 瞬时频率序列 →
 *   按时间窗切片、小窗平均 → freqToBrightness。
 */
export const robot36: Mode = {
  name: 'robot36',
  displayName: 'Robot 36',
  visCode: 0x88,
  width: WIDTH,
  height: 240,
  rowsPerScanLine: 1,
  scanLineMs: LINE_MS,

  decodeLine(samples, scanLineIndex, state, sampleRate): Uint8ClampedArray {
    const row = scanLineIndex
    // 整行一次 FM 解调
    const { i, q } = toAnalytic(samples, sampleRate)
    const freq = instantFreq(i, q, sampleRate)

    // 逐行 sync 矫正:消除发送端时钟漂移累积的斜切
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
      const ci = x >> 1
      const [r, g, b] = yuvToRgb(yLine[x]!, cb[ci] ?? 128, cr[ci] ?? 128)
      rgba[x * 4 + 0] = r
      rgba[x * 4 + 1] = g
      rgba[x * 4 + 2] = b
      rgba[x * 4 + 3] = 255
    }
    return rgba
  }
}
