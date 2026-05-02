// src/lib/sstv/modes/scottie-s2.ts
import type { Mode } from './types'
import { fmDemod } from '../dsp'
import { sampleBrightnessSection } from './sample-section'
import { hampelFilter } from '../sync-filter'

/**
 * Scottie S2:同 S1 结构,颜色段缩短为 88.064ms。
 * 行结构:sep(1.5) + G(88.064) + sep(1.5) + B(88.064) + sync(9) + porch(1.5) + R(88.064)
 * 总行 277.692ms。
 *
 * VIS on-wire: 0xB8(7-bit 0111000 popcount=3 → parity bit=1 → on-wire 10111000)
 */
const SEP_MS = 1.5
const SYNC_MS = 9
const PORCH_MS = 1.5
const COLOR_MS = 88.064
const LINE_MS = SEP_MS + COLOR_MS + SEP_MS + COLOR_MS + SYNC_MS + PORCH_MS + COLOR_MS // 277.692

const G_START = SEP_MS
const B_START = G_START + COLOR_MS + SEP_MS // 91.064
const SYNC_START = B_START + COLOR_MS // 179.128
const R_START = SYNC_START + SYNC_MS + PORCH_MS // 189.628

const WIDTH = 320
const CLAMP_MS = 20
const SEARCH_PRE_MS = 20

function detectMidSyncOffset(
  freq: Float32Array,
  sampleRate: number
): { raw: number; clamped: number } {
  const startIdx = Math.max(0, Math.round(((SYNC_START - SEARCH_PRE_MS) / 1000) * sampleRate))
  const endIdx = Math.min(
    freq.length,
    Math.round(((SYNC_START + SEARCH_PRE_MS + SYNC_MS) / 1000) * sampleRate)
  )
  const winSamples = Math.max(4, Math.round((SYNC_MS / 1000) * sampleRate))
  if (endIdx - startIdx < winSamples + 4) return { raw: NaN, clamped: 0 }

  let sum = 0
  for (let k = startIdx; k < startIdx + winSamples; k++) sum += freq[k] ?? 0
  let bestStart = startIdx
  let bestDist = Math.abs(sum / winSamples - 1200)
  for (let s = startIdx + 1; s + winSamples <= endIdx; s++) {
    sum += (freq[s + winSamples - 1] ?? 0) - (freq[s - 1] ?? 0)
    const dist = Math.abs(sum / winSamples - 1200)
    if (dist < bestDist) {
      bestDist = dist
      bestStart = s
    }
  }
  if (bestDist > 200) return { raw: NaN, clamped: 0 }

  const detectedCenterMs = ((bestStart + winSamples / 2) / sampleRate) * 1000
  const expectedCenterMs = SYNC_START + SYNC_MS / 2
  const raw = detectedCenterMs - expectedCenterMs
  const clamped = Math.abs(raw) > CLAMP_MS ? 0 : raw
  return { raw, clamped }
}

export const scottieS2: Mode = {
  name: 'scottie-s2',
  displayName: 'Scottie S2',
  visCode: 0xb8,
  width: WIDTH,
  height: 256,
  rowsPerScanLine: 1,
  scanLineMs: LINE_MS,
  preludeMs: 9,

  decodeLine(samples, _scanLineIndex, state, sampleRate, warmupSamples = 0): Uint8ClampedArray {
    const freq = fmDemod(samples, sampleRate, warmupSamples)

    const { raw: rawSync, clamped: syncRaw } = detectMidSyncOffset(freq, sampleRate)
    const st = state as { lastRawSyncMs?: number; syncWindow?: number[] }
    st.lastRawSyncMs = rawSync

    // Hampel 滤波:孤立异常用中位数替换,正常 slant 缓变直接通过
    st.syncWindow ??= []
    st.syncWindow.push(syncRaw)
    if (st.syncWindow.length > 5) st.syncWindow.shift()
    const syncOffset = hampelFilter(st.syncWindow)

    const gStart = G_START + syncOffset
    const bStart = B_START + syncOffset
    const rStart = R_START + syncOffset

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
