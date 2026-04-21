// src/lib/sstv/modes/robot36.ts
import type { Mode } from './types'
import { instantFreq, toAnalytic } from '../dsp'
import { sampleBrightnessSection } from './sample-section'
import { detectSyncPulseOffsetMs } from './sync-detect'

// 各段耗时(ms),和规范一致
const SYNC_MS = 9
const PORCH1_MS = 3
const Y_MS = 88
const SEPARATOR_MS = 4.5
const PORCH2_MS = 1.5
const CHROMA_MS = 44
const LINE_MS = SYNC_MS + PORCH1_MS + Y_MS + SEPARATOR_MS + PORCH2_MS + CHROMA_MS // 150
const SCAN_LINE_MS = LINE_MS * 2 // 300ms,一个 scan line 包 2 行

const WIDTH = 320
const CHROMA_WIDTH = 160 // 水平 2:1 subsampled,ci = x >> 1

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
 * Robot36:每对行 300ms,包含 2 行:
 *   第一行(偶行): sync + porch + Y[even] + 2300Hz sep + porch + R-Y(Cr)
 *   第二行(奇行): sync + porch + Y[odd]  + 1500Hz sep + porch + B-Y(Cb)
 * 两行共享同一组 Cr/Cb(垂直 4:2:0 subsampling),消除隔行色震。
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
  rowsPerScanLine: 2,
  scanLineMs: SCAN_LINE_MS,

  decodeLine(samples, _scanLineIndex, state, sampleRate): Uint8ClampedArray {
    // 整段 300ms 一次 FM 解调
    const { i, q } = toAnalytic(samples, sampleRate)
    const freq = instantFreq(i, q, sampleRate)

    // Row 0(偶行)的 sync 在 0~20ms 范围内检测
    const row0SearchEnd = Math.round(20 * sampleRate / 1000)
    const { raw: rawSync0, clamped: sync0Raw } = detectSyncOffsetMsInternal(
      freq.subarray(0, Math.min(freq.length, row0SearchEnd)),
      sampleRate
    )

    // Row 1(奇行)的 sync 在 150~170ms 范围内检测(相对整段 300ms 音频)
    const row1StartSamples = Math.round(LINE_MS * sampleRate / 1000)
    const row1SearchEnd = Math.round((LINE_MS + 20) * sampleRate / 1000)
    const { clamped: sync1Raw } = detectSyncOffsetMsInternal(
      freq.subarray(row1StartSamples, Math.min(freq.length, row1SearchEnd)),
      sampleRate
    )

    // 把第一行的 raw sync 偏移写入 state 供 decoder 的 slant 校准用
    const st = state as {
      lastRawSyncMs?: number
      sync0Window?: number[]
      sync1Window?: number[]
    }
    st.lastRawSyncMs = rawSync0

    // 中位数滤波:两行各自维护最近 5 个 clamped sync 的窗口,取中位数 → 消除 Opus 噪声
    // 下的行间抖动(梳齿/错位)
    st.sync0Window ??= []
    st.sync0Window.push(sync0Raw)
    if (st.sync0Window.length > 5) st.sync0Window.shift()
    const s0sorted = [...st.sync0Window].sort((a, b) => a - b)
    const sync0 = s0sorted[Math.floor(s0sorted.length / 2)]!

    st.sync1Window ??= []
    st.sync1Window.push(sync1Raw)
    if (st.sync1Window.length > 5) st.sync1Window.shift()
    const s1sorted = [...st.sync1Window].sort((a, b) => a - b)
    const sync1 = s1sorted[Math.floor(s1sorted.length / 2)]!

    // Row 0 时间窗(绝对 ms)
    const y0Start = SYNC_MS + PORCH1_MS + sync0
    const y0End = y0Start + Y_MS
    const crStart = y0End + SEPARATOR_MS + PORCH2_MS
    const crEnd = crStart + CHROMA_MS

    // Row 1 时间窗(相对整段音频,加 LINE_MS=150ms 偏移)
    const y1Start = LINE_MS + SYNC_MS + PORCH1_MS + sync1
    const y1End = y1Start + Y_MS
    const cbStart = y1End + SEPARATOR_MS + PORCH2_MS
    const cbEnd = cbStart + CHROMA_MS

    const y0 = sampleBrightnessSection(freq, sampleRate, y0Start, y0End, WIDTH)
    const cr = sampleBrightnessSection(freq, sampleRate, crStart, crEnd, CHROMA_WIDTH)
    const y1 = sampleBrightnessSection(freq, sampleRate, y1Start, y1End, WIDTH)
    const cb = sampleBrightnessSection(freq, sampleRate, cbStart, cbEnd, CHROMA_WIDTH)

    // 用同一组 (Cr, Cb) 画两行 —— 正确的 4:2:0,消除隔行色震
    const rgba = new Uint8ClampedArray(WIDTH * 2 * 4)
    for (let x = 0; x < WIDTH; x++) {
      const ci = x >> 1 // CHROMA_WIDTH=160,两像素共用一个色差
      const [r0, g0, b0] = yuvToRgb(y0[x]!, cb[ci] ?? 128, cr[ci] ?? 128)
      const [r1, g1, b1] = yuvToRgb(y1[x]!, cb[ci] ?? 128, cr[ci] ?? 128)
      rgba[x * 4 + 0] = r0
      rgba[x * 4 + 1] = g0
      rgba[x * 4 + 2] = b0
      rgba[x * 4 + 3] = 255
      rgba[(WIDTH + x) * 4 + 0] = r1
      rgba[(WIDTH + x) * 4 + 1] = g1
      rgba[(WIDTH + x) * 4 + 2] = b1
      rgba[(WIDTH + x) * 4 + 3] = 255
    }
    return rgba
  }
}
