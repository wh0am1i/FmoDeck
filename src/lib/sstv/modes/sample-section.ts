import { freqToBrightness } from '../dsp'

export function sampleBrightnessSection(
  freq: Float32Array,
  sampleRate: number,
  startMs: number,
  endMs: number,
  count: number
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(count)
  const sectionStartIdx = Math.max(0, Math.round((startMs * sampleRate) / 1000))
  const sectionEndIdx = Math.min(
    freq.length,
    Math.round((endMs * sampleRate) / 1000)
  )
  const sectionSamples = sectionEndIdx - sectionStartIdx

  if (sectionSamples <= 0) {
    return out
  }

  const perPixelMs = (endMs - startMs) / count
  const perPixelSamples = Math.max(1, Math.round((perPixelMs * sampleRate) / 1000))
  const windowSamples = Math.min(sectionSamples, Math.max(4, perPixelSamples))
  const minStartIdx = sectionStartIdx
  const maxStartIdx = Math.max(sectionStartIdx, sectionEndIdx - windowSamples)

  for (let i = 0; i < count; i++) {
    const centerMs = startMs + perPixelMs * (i + 0.5)
    const centerIdx = Math.round((centerMs * sampleRate) / 1000)
    const unclampedStartIdx = centerIdx - Math.floor(windowSamples / 2)
    const startIdx = Math.min(
      maxStartIdx,
      Math.max(minStartIdx, unclampedStartIdx)
    )
    const endIdx = startIdx + windowSamples

    let sum = 0
    for (let k = startIdx; k < endIdx; k++) sum += freq[k] ?? 0
    out[i] = freqToBrightness(sum / windowSamples)
  }

  return out
}
