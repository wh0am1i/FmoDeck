// src/lib/sstv/modes/martin-m1.ts
import type { Mode } from './types'
import { estimateFreq, freqToBrightness } from '../dsp'

const SYNC_MS = 4.862
const PORCH_MS = 0.572
const COLOR_MS = 146.432
const LINE_MS = SYNC_MS + PORCH_MS + (COLOR_MS + PORCH_MS) * 3 // 446.446

const WIDTH = 320

function sampleColor(
  samples: Float32Array,
  sampleRate: number,
  startMs: number
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(WIDTH)
  const perPxMs = COLOR_MS / WIDTH
  // 窗口保底 96 样本(~3×1500Hz 周期,避免短窗 Goertzel 泄漏)。
  // 与 robot36.sampleSection 统一:接受相邻像素 overlap 带来的轻微模糊,
  // 公告图场景可接受。
  const windowSamples = Math.max(96, Math.round((perPxMs * 2 * sampleRate) / 1000))
  for (let x = 0; x < WIDTH; x++) {
    const centerMs = startMs + perPxMs * (x + 0.5)
    const centerIdx = Math.round((centerMs * sampleRate) / 1000)
    const startIdx = Math.max(0, centerIdx - Math.floor(windowSamples / 2))
    const end = Math.min(samples.length, startIdx + windowSamples)
    if (end - startIdx < 8) {
      out[x] = 0
      continue
    }
    out[x] = freqToBrightness(estimateFreq(samples.subarray(startIdx, end), sampleRate, 1500, 2300))
  }
  return out
}

/** Martin M1:每行 446.446ms,sync-porch-G-sep-B-sep-R-sep,320×256 RGB。VIS on-wire 0xAC(7-bit code 0x2C + parity bit 7=1)。 */
export const martinM1: Mode = {
  name: 'martin-m1',
  displayName: 'Martin M1',
  visCode: 0xac,
  width: WIDTH,
  height: 256,
  lineMs: LINE_MS,

  decodeLine(samples, _row, _state, sampleRate): Uint8ClampedArray {
    const gStart = SYNC_MS + PORCH_MS
    const bStart = gStart + COLOR_MS + PORCH_MS
    const rStart = bStart + COLOR_MS + PORCH_MS

    const g = sampleColor(samples, sampleRate, gStart)
    const b = sampleColor(samples, sampleRate, bStart)
    const r = sampleColor(samples, sampleRate, rStart)

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
