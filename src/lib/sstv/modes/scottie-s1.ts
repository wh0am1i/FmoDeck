// src/lib/sstv/modes/scottie-s1.ts
import type { Mode } from './types'
import { fmDemod } from '../dsp'
import { sampleBrightnessSection } from './sample-section'
import { hampelFilter } from '../sync-filter'

/**
 * Scottie S1 行结构(sync 在中段):
 *   sep(1.5) + G(138.24) + sep(1.5) + B(138.24) + sync(9) + porch(1.5) + R(138.24)
 * 总行 428.22ms,RGB 三通道 320×256。
 *
 * VIS 之后服务端会发一段 9ms 1200Hz 起始 sync,decoder 通过 mode.preludeMs=9 跳过,
 * 让 row 0 的 audio 直接从 sep+G 开始,与后续行结构一致。
 *
 * Sync 在中段的好处:每行 sync 后还有 porch+R 段,sync 位置可作为本行 G/B/R
 * 三段位置的统一参考(syncOffset 同时矫正 G/B/R)。
 *
 * VIS on-wire: 0x3C(7-bit 0111100,popcount=4 偶,parity=0)
 */
const SEP_MS = 1.5
const SYNC_MS = 9
const PORCH_MS = 1.5
const COLOR_MS = 138.24
const LINE_MS = SEP_MS + COLOR_MS + SEP_MS + COLOR_MS + SYNC_MS + PORCH_MS + COLOR_MS // 428.22

const G_START = SEP_MS // 1.5
const B_START = G_START + COLOR_MS + SEP_MS // 141.24
const SYNC_START = B_START + COLOR_MS // 279.48
const R_START = SYNC_START + SYNC_MS + PORCH_MS // 289.98

const WIDTH = 320
const CLAMP_MS = 20
const SEARCH_PRE_MS = 20 // sync 检测搜索范围:期望位置 ±20ms

/**
 * 在 freq 数组中以 SYNC_START 为期望位置 ±SEARCH_PRE_MS 搜索 1200Hz sync。
 * 返回 raw=detected_center - expected_center(ms),clamped=钳制到 ±clampMs 后的值。
 * 找不到时 raw=NaN, clamped=0。
 */
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

  // 滑动窗口找 mean 最接近 1200 的位置
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

export const scottieS1: Mode = {
  name: 'scottie-s1',
  displayName: 'Scottie S1',
  visCode: 0x3c,
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

    // Hampel 滤波:孤立异常用中位数替换,正常 slant 缓变直接通过(避免梯田台阶)
    st.syncWindow ??= []
    st.syncWindow.push(syncRaw)
    if (st.syncWindow.length > 5) st.syncWindow.shift()
    const syncOffset = hampelFilter(st.syncWindow)

    // sync 偏移同时影响 G/B/R 三段位置(整行被 syncOffset 平移)
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
