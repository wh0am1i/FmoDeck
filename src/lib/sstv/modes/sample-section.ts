import { freqToBrightness } from '../dsp'

/**
 * 行内采样:把 freq 数组的 [startMs, endMs) 段切成 count 个像素。
 *
 * 默认 box 平均(每像素 max(4, perPixelSamples) 个样本求均值),足够覆盖
 * width=320 的 mode。但对 PD120(width=640、@8kHz 单像素 ~1.5 样本)box 窗口
 * 被 max(4, ...) 撑成 4 样本,相邻像素重叠 60%,横向细节糊掉。
 *
 * 传 `useLanczos: true` 切换到 Lanczos-3 重建:用 sinc 加权窗在浮点位置上插值,
 * 保留亚样本分辨率;@8k 输入下 PD120 横向细节明显锐利。其他 mode 默认走 box,
 * 一来 box 在 windowSamples ≥ perPixelSamples 时已足够,二来 Lanczos 计算
 * 量是 box 的 ~6 倍。
 */
export interface SampleOptions {
  useLanczos?: boolean
}

export function sampleBrightnessSection(
  freq: Float32Array,
  sampleRate: number,
  startMs: number,
  endMs: number,
  count: number,
  options: SampleOptions = {}
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(count)
  const sectionStartIdx = Math.max(0, Math.round((startMs * sampleRate) / 1000))
  const sectionEndIdx = Math.min(freq.length, Math.round((endMs * sampleRate) / 1000))
  const sectionSamples = sectionEndIdx - sectionStartIdx

  if (sectionSamples <= 0) {
    return out
  }

  const perPixelMs = (endMs - startMs) / count

  if (options.useLanczos) {
    for (let i = 0; i < count; i++) {
      const centerMs = startMs + perPixelMs * (i + 0.5)
      const centerIdx = (centerMs * sampleRate) / 1000 // 浮点
      out[i] = freqToBrightness(lanczosSample(freq, centerIdx))
    }
    return out
  }

  // Box 平均(原行为)
  const perPixelSamples = Math.max(1, Math.round((perPixelMs * sampleRate) / 1000))
  const windowSamples = Math.min(sectionSamples, Math.max(4, perPixelSamples))
  const minStartIdx = sectionStartIdx
  const maxStartIdx = Math.max(sectionStartIdx, sectionEndIdx - windowSamples)

  for (let i = 0; i < count; i++) {
    const centerMs = startMs + perPixelMs * (i + 0.5)
    const centerIdx = Math.round((centerMs * sampleRate) / 1000)
    const unclampedStartIdx = centerIdx - Math.floor(windowSamples / 2)
    const startIdx = Math.min(maxStartIdx, Math.max(minStartIdx, unclampedStartIdx))
    const endIdx = startIdx + windowSamples

    let sum = 0
    for (let k = startIdx; k < endIdx; k++) sum += freq[k] ?? 0
    out[i] = freqToBrightness(sum / windowSamples)
  }

  return out
}

/**
 * Lanczos-3 内核:L(x) = sinc(x) · sinc(x/3) for |x| < 3,otherwise 0。
 */
const LANCZOS_A = 3
function lanczosKernel(x: number): number {
  if (x === 0) return 1
  const ax = Math.abs(x)
  if (ax >= LANCZOS_A) return 0
  const px = Math.PI * x
  return (LANCZOS_A * Math.sin(px) * Math.sin(px / LANCZOS_A)) / (px * px)
}

/** 在 freq 的浮点位置 x 上做 Lanczos-3 重建。越界样本忽略,权重归一化。 */
function lanczosSample(freq: Float32Array, x: number): number {
  const i0 = Math.floor(x)
  let sum = 0
  let weightSum = 0
  for (let i = i0 - LANCZOS_A + 1; i <= i0 + LANCZOS_A; i++) {
    if (i < 0 || i >= freq.length) continue
    const w = lanczosKernel(x - i)
    sum += freq[i]! * w
    weightSum += w
  }
  return weightSum > 0 ? sum / weightSum : 0
}
