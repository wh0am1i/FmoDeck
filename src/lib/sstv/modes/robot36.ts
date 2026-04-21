// src/lib/sstv/modes/robot36.ts
import type { Mode } from './types'
import { estimateFreq, freqToBrightness } from '../dsp'

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
 * 在 [startMs, endMs] 时间窗内取 `count` 个等间距像素的频率,再映射到亮度。
 *
 * 窗口策略:每像素的 Goertzel 窗口取 2× 像素宽度并保底 48 样本,
 * 相邻像素有 50% 重叠,抑制短窗能量估计噪声;在纯色 patch 测试的容差(±20)里完全吃得下。
 */
function sampleSection(
  samples: Float32Array,
  sampleRate: number,
  startMs: number,
  endMs: number,
  count: number
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(count)
  const perPixelMs = (endMs - startMs) / count
  // 窗口保底 48 样本(覆盖 ~1.5 个 1500Hz 周期)。Robot36 每像素 ~13 样本,
  // 窗口覆盖 ~3-4 个邻居,平衡短窗能量泄漏和横向边缘平滑。
  const windowSamples = Math.max(
    48,
    Math.round((perPixelMs * 2 * sampleRate) / 1000)
  )
  for (let i = 0; i < count; i++) {
    const centerMs = startMs + perPixelMs * (i + 0.5)
    const centerIdx = Math.round((centerMs * sampleRate) / 1000)
    const startIdx = Math.max(0, centerIdx - Math.floor(windowSamples / 2))
    const end = Math.min(samples.length, startIdx + windowSamples)
    if (end - startIdx < 8) {
      out[i] = 0
      continue
    }
    const win = samples.subarray(startIdx, end)
    const f = estimateFreq(win, sampleRate, 1500, 2300)
    out[i] = freqToBrightness(f)
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
 * Robot36:每行 150ms,每行携带 Y + 一个色差(偶行 R-Y,奇行 B-Y)。
 * 相邻两行共享色差:输出 RGBA 时,每两行用同一组 Cr/Cb(4:2:0)。
 * 简化版:仅用本行色差,相当于每像素都带色偏但不与相邻行混合。
 */
export const robot36: Mode = {
  name: 'robot36',
  displayName: 'Robot 36',
  visCode: 0x88,
  width: WIDTH,
  height: 240,
  lineMs: LINE_MS,

  decodeLine(samples, row, state, sampleRate): Uint8ClampedArray {
    const yStart = SYNC_MS + PORCH1_MS
    const yEnd = yStart + Y_MS
    const chromaStart = yEnd + SEPARATOR_MS + PORCH2_MS
    const chromaEnd = chromaStart + CHROMA_MS

    const yLine = sampleSection(samples, sampleRate, yStart, yEnd, WIDTH)
    const chroma = sampleSection(samples, sampleRate, chromaStart, chromaEnd, CHROMA_WIDTH)

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
      const ci = x >> 1 // 4:2:0,两个像素共享一个色差
      const [r, g, b] = yuvToRgb(yLine[x]!, cb[ci] ?? 128, cr[ci] ?? 128)
      rgba[x * 4 + 0] = r
      rgba[x * 4 + 1] = g
      rgba[x * 4 + 2] = b
      rgba[x * 4 + 3] = 255
    }
    return rgba
  }
}
