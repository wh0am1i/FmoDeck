// src/lib/sstv/modes/martin-m2.ts
import type { Mode } from './types'
import { instantFreq, toAnalytic } from '../dsp'
import { sampleBrightnessSection } from './sample-section'

const SYNC_MS = 4.862
const PORCH_MS = 0.572
const COLOR_MS = 73.216
const LINE_MS = SYNC_MS + PORCH_MS + (COLOR_MS + PORCH_MS) * 3 // 226.798

const WIDTH = 320

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
  const searchMs = 40 // sync 4.862ms + 大余量(给未校准期的累积漂移留空间)
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
  const expectedMs = SYNC_MS / 2
  const raw = detectedMs - expectedMs
  const clamped = Math.abs(raw) > CLAMP_MS ? 0 : raw
  return { raw, clamped }
}

/** Martin M2:每行 226.798ms,sync-porch-G-sep-B-sep-R-sep,320×256 RGB。 */
export const martinM2: Mode = {
  name: 'martin-m2',
  displayName: 'Martin M2',
  visCode: 0x28,
  width: WIDTH,
  height: 256,
  rowsPerScanLine: 1,
  scanLineMs: LINE_MS,

  decodeLine(samples, _scanLineIndex, state, sampleRate): Uint8ClampedArray {
    const { i, q } = toAnalytic(samples, sampleRate)
    const freq = instantFreq(i, q, sampleRate)

    const { raw: rawSync, clamped: syncRaw } = detectSyncOffsetMsInternal(freq, sampleRate)
    const st = state as { lastRawSyncMs?: number; syncWindow?: number[] }
    st.lastRawSyncMs = rawSync

    // 中位数滤波:抑制 Opus 失真下的单行 sync 抖动(避免行间梳齿)
    st.syncWindow ??= []
    st.syncWindow.push(syncRaw)
    if (st.syncWindow.length > 5) st.syncWindow.shift()
    const sorted = [...st.syncWindow].sort((a, b) => a - b)
    const syncOffset = sorted[Math.floor(sorted.length / 2)]!

    const gStart = SYNC_MS + PORCH_MS + syncOffset
    const bStart = gStart + COLOR_MS + PORCH_MS
    const rStart = bStart + COLOR_MS + PORCH_MS

    const g = sampleBrightnessSection(freq, sampleRate, gStart, gStart + COLOR_MS, WIDTH)
    const b = sampleBrightnessSection(freq, sampleRate, bStart, bStart + COLOR_MS, WIDTH)
    const r = sampleBrightnessSection(freq, sampleRate, rStart, rStart + COLOR_MS, WIDTH)

    const rgba = new Uint8ClampedArray(WIDTH * 4)
    for (let x = 0; x < WIDTH; x++) {
      rgba[x * 4 + 0] = r[x]!
      rgba[x * 4 + 1] = g[x]!
      rgba[x * 4 + 2] = b[x]!
      rgba[x * 4 + 3] = 255
    }
    return rgba
  }
}
