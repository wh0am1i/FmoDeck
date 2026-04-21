export interface SyncDetectOptions {
  syncMs: number
  searchMs: number
  clampMs: number
}

export function detectSyncPulseOffsetMs(
  freq: Float32Array,
  sampleRate: number,
  options: SyncDetectOptions
): { raw: number; clamped: number } {
  const { syncMs, searchMs, clampMs } = options
  const searchSamples = Math.min(
    freq.length,
    Math.round((searchMs * sampleRate) / 1000)
  )
  const winSamples = Math.max(4, Math.round((syncMs * sampleRate) / 1000))
  // 未检测到时返回 NaN(而非 0),让 caller 区分「对齐良好」和「找不到 sync」。
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
  const raw = detectedMs - syncMs / 2
  const clamped = Math.abs(raw) > clampMs ? 0 : raw
  return { raw, clamped }
}
