import { describe, expect, it } from 'vitest'
import { synthTone, TEST_SAMPLE_RATE } from './__tests__/fixtures'
import { LinearPcmResampler } from './linear-resampler'

function concatChunks(chunks: Float32Array[]): Float32Array {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
  const out = new Float32Array(total)
  let offset = 0
  for (const chunk of chunks) {
    out.set(chunk, offset)
    offset += chunk.length
  }
  return out
}

describe('LinearPcmResampler', () => {
  it('同采样率时原样透传', () => {
    const input = synthTone(1900, 20, 8000)
    const resampler = new LinearPcmResampler(8000, 8000)
    const output = resampler.process(input)
    expect(output).toEqual(input)
  })

  it('分块处理与整块处理结果保持一致', () => {
    const input = synthTone(1900, 200, 8000)

    const whole = new LinearPcmResampler(8000, TEST_SAMPLE_RATE).process(input)

    const chunkedResampler = new LinearPcmResampler(8000, TEST_SAMPLE_RATE)
    const chunked = concatChunks([
      chunkedResampler.process(input.subarray(0, 137)),
      chunkedResampler.process(input.subarray(137, 509)),
      chunkedResampler.process(input.subarray(509))
    ])

    expect(chunked.length).toBe(whole.length)
    for (let i = 0; i < whole.length; i++) {
      expect(Math.abs(chunked[i]! - whole[i]!)).toBeLessThan(1e-6)
    }
  })

  it('升采样后长度与目标采样率匹配', () => {
    const input = synthTone(1200, 300, 8000)
    const resampler = new LinearPcmResampler(8000, TEST_SAMPLE_RATE)
    const output = resampler.process(input)
    const expected = Math.floor((input.length - 1) * (TEST_SAMPLE_RATE / 8000))
    expect(output.length).toBe(expected)
  })
})
