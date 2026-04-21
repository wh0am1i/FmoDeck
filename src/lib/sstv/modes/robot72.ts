// src/lib/sstv/modes/robot72.ts
import type { Mode } from './types'
import { instantFreq, toAnalytic } from '../dsp'
import { sampleBrightnessSection } from './sample-section'
import { detectSyncPulseOffsetMs } from './sync-detect'

// 各段耗时(ms),和 Robot 72 规范一致
const SYNC_MS = 9
const PORCH1_MS = 3
const Y_MS = 138
const RY_SEPARATOR_MS = 4.5
const RY_PORCH_MS = 1.5
const RY_MS = 69
const BY_SEPARATOR_MS = 4.5
const BY_PORCH_MS = 1.5
const BY_MS = 69
const SCAN_LINE_MS =
  SYNC_MS +
  PORCH1_MS +
  Y_MS +
  RY_SEPARATOR_MS +
  RY_PORCH_MS +
  RY_MS +
  BY_SEPARATOR_MS +
  BY_PORCH_MS +
  BY_MS // 300

const WIDTH = 320
const CHROMA_WIDTH = 160 // 4:2:2：两个像素共享一个 R-Y / B-Y 样本

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

const CLAMP_MS = 20

/**
 * 在本行前 20ms 内检测 1200Hz sync pulse 的实际中心位置(ms)。
 * 返回 { raw: 未钳制偏移, clamped: 钳制后偏移 }。
 * 找不到 sync(bestDist > 200)时两者均返回 0。
 */
function detectSyncOffsetMsInternal(
  freq: Float32Array,
  sampleRate: number
): { raw: number; clamped: number } {
  return detectSyncPulseOffsetMs(freq, sampleRate, {
    syncMs: SYNC_MS,
    searchMs: 40,
    clampMs: CLAMP_MS
  })
}

/**
 * Robot72:每行 300ms,每行同时携带 Y + R-Y + B-Y。
 * 色差在水平方向 4:2:2，下采样为 160 像素；不像 Robot36 那样跨两行共享。
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

  decodeLine(samples, _scanLineIndex, state, sampleRate): Uint8ClampedArray {
    // 整行一次 FM 解调
    const { i, q } = toAnalytic(samples, sampleRate)
    const freq = instantFreq(i, q, sampleRate)

    // 逐行 sync 矫正
    const { raw: rawSync, clamped: syncRaw } = detectSyncOffsetMsInternal(freq, sampleRate)
    const s = state as {
      cr?: Uint8ClampedArray
      cb?: Uint8ClampedArray
      lastRawSyncMs?: number
      syncWindow?: number[]
    }
    s.lastRawSyncMs = rawSync

    // 单行 sync 检测会抖动;取最近 5 行 clamped sync 的中位数避免梳齿。
    s.syncWindow ??= []
    s.syncWindow.push(syncRaw)
    if (s.syncWindow.length > 5) s.syncWindow.shift()
    const sorted = [...s.syncWindow].sort((a, b) => a - b)
    const syncOffset = sorted[Math.floor(sorted.length / 2)]!

    const yStart = SYNC_MS + PORCH1_MS + syncOffset
    const yEnd = yStart + Y_MS
    const ryStart = yEnd + RY_SEPARATOR_MS + RY_PORCH_MS
    const ryEnd = ryStart + RY_MS
    const byStart = ryEnd + BY_SEPARATOR_MS + BY_PORCH_MS
    const byEnd = byStart + BY_MS

    const yLine = sampleBrightnessSection(freq, sampleRate, yStart, yEnd, WIDTH)
    const cr = sampleBrightnessSection(freq, sampleRate, ryStart, ryEnd, CHROMA_WIDTH)
    const cb = sampleBrightnessSection(freq, sampleRate, byStart, byEnd, CHROMA_WIDTH)

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
