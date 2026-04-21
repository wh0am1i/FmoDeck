// src/lib/sstv/__tests__/fixtures.ts

/** 固定采样率,与生产的 ctx.sampleRate 对齐。 */
export const TEST_SAMPLE_RATE = 48000

/** 生成一段纯正弦 tone,amplitude 默认 0.5(与 engine 里 PCM16→Float32 后的量级一致)。 */
export function synthTone(
  freqHz: number,
  durationMs: number,
  sampleRate = TEST_SAMPLE_RATE,
  amplitude = 0.5
): Float32Array {
  const n = Math.round((durationMs / 1000) * sampleRate)
  const out = new Float32Array(n)
  const w = (2 * Math.PI * freqHz) / sampleRate
  for (let i = 0; i < n; i++) out[i] = amplitude * Math.sin(w * i)
  return out
}

/** 拼接多段 Float32Array。 */
export function concat(...chunks: Float32Array[]): Float32Array {
  const total = chunks.reduce((s, c) => s + c.length, 0)
  const out = new Float32Array(total)
  let off = 0
  for (const c of chunks) {
    out.set(c, off)
    off += c.length
  }
  return out
}

/**
 * 生成完整的 VIS 头:1900 Hz leader 300ms + 1200 Hz break 10ms + 1900 Hz leader 300ms +
 * 1200 Hz start bit 30ms + 8 bits LSB first(30ms each,1100 Hz=1/1300 Hz=0) +
 * 1200 Hz stop 30ms。
 *
 * 入参 `code` 必须是完整 8-bit on-wire 值(bit 7 = even parity over bits 0-6)。
 */
export function synthVis(code: number, sampleRate = TEST_SAMPLE_RATE): Float32Array {
  const parts: Float32Array[] = [
    synthTone(1900, 300, sampleRate),
    synthTone(1200, 10, sampleRate),
    synthTone(1900, 300, sampleRate),
    synthTone(1200, 30, sampleRate) // start bit
  ]
  for (let i = 0; i < 8; i++) {
    const b = (code >> i) & 1
    parts.push(synthTone(b ? 1100 : 1300, 30, sampleRate))
  }
  parts.push(synthTone(1200, 30, sampleRate)) // stop bit
  return concat(...parts)
}

/** 把亮度(0-255)映射成对应 SSTV 频率:1500=黑, 2300=白。 */
export function brightnessToFreq(value: number): number {
  const v = Math.max(0, Math.min(255, value))
  return 1500 + (v / 255) * 800
}
