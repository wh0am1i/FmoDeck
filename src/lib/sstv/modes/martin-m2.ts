// src/lib/sstv/modes/martin-m2.ts
import type { Mode } from './types'
import { freqToBrightness, instantFreq, toAnalytic } from '../dsp'

const SYNC_MS = 4.862
const PORCH_MS = 0.572
const COLOR_MS = 73.216
const LINE_MS = SYNC_MS + PORCH_MS + (COLOR_MS + PORCH_MS) * 3 // 226.798

const WIDTH = 320

function sampleColor(
  freq: Float32Array,
  sampleRate: number,
  startMs: number
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(WIDTH)
  const perPxMs = COLOR_MS / WIDTH
  const perPxSamples = Math.max(1, Math.round((perPxMs * sampleRate) / 1000))
  const windowSamples = Math.max(4, perPxSamples)
  for (let x = 0; x < WIDTH; x++) {
    const centerMs = startMs + perPxMs * (x + 0.5)
    const centerIdx = Math.round((centerMs * sampleRate) / 1000)
    const startIdx = Math.max(0, centerIdx - Math.floor(windowSamples / 2))
    const end = Math.min(freq.length, startIdx + windowSamples)
    if (end <= startIdx) {
      out[x] = 0
      continue
    }
    let sum = 0
    for (let k = startIdx; k < end; k++) sum += freq[k] ?? 0
    out[x] = freqToBrightness(sum / (end - startIdx))
  }
  return out
}

/**
 * 在本行前 12ms 内检测 1200Hz sync pulse 的实际中心位置(ms)。
 * 返回相对理论 sync 中心(SYNC_MS/2)的偏移量(ms);找不到或偏移太大时返回 0。
 */
function detectSyncOffsetMs(freq: Float32Array, sampleRate: number): number {
  const searchMs = 12
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
  const expectedMs = SYNC_MS / 2
  const offsetMs = detectedMs - expectedMs

  if (Math.abs(offsetMs) > 2) return 0
  return offsetMs
}

/** Martin M2:每行 226.798ms,sync-porch-G-sep-B-sep-R-sep,320×256 RGB。 */
export const martinM2: Mode = {
  name: 'martin-m2',
  displayName: 'Martin M2',
  visCode: 0x28,
  width: WIDTH,
  height: 256,
  lineMs: LINE_MS,

  decodeLine(samples, _row, state, sampleRate): Uint8ClampedArray {
    const { i, q } = toAnalytic(samples, sampleRate)
    const freq = instantFreq(i, q, sampleRate)

    // 逐行 sync 矫正 + 跨行低通平滑
    const s = state as { syncSmooth?: number }
    const raw = detectSyncOffsetMs(freq, sampleRate)
    const prev = s.syncSmooth ?? 0
    const syncOffset = 0.3 * raw + 0.7 * prev
    s.syncSmooth = syncOffset

    const gStart = SYNC_MS + PORCH_MS + syncOffset
    const bStart = gStart + COLOR_MS + PORCH_MS
    const rStart = bStart + COLOR_MS + PORCH_MS

    const g = sampleColor(freq, sampleRate, gStart)
    const b = sampleColor(freq, sampleRate, bStart)
    const r = sampleColor(freq, sampleRate, rStart)

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
