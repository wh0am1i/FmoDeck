export class LinearPcmResampler {
  private readonly ratio: number
  private position = 0
  private lastSample = 0
  private seeded = false

  constructor(
    private readonly sourceSampleRate: number,
    private readonly targetSampleRate: number
  ) {
    this.ratio = sourceSampleRate / targetSampleRate
  }

  reset(): void {
    this.position = 0
    this.lastSample = 0
    this.seeded = false
  }

  process(chunk: Float32Array): Float32Array {
    if (chunk.length === 0) return new Float32Array(0)
    if (this.sourceSampleRate === this.targetSampleRate) {
      return new Float32Array(chunk)
    }

    let input: Float32Array
    if (this.seeded) {
      input = new Float32Array(chunk.length + 1)
      input[0] = this.lastSample
      input.set(chunk, 1)
    } else {
      input = chunk
      this.seeded = true
    }

    const outputLength = Math.max(0, Math.floor((input.length - 1 - this.position) / this.ratio) + 1)
    const out = new Float32Array(outputLength)

    let outIdx = 0
    while (this.position < input.length - 1 && outIdx < out.length) {
      const left = Math.floor(this.position)
      const frac = this.position - left
      const a = input[left] ?? 0
      const b = input[left + 1] ?? a
      out[outIdx++] = a + (b - a) * frac
      this.position += this.ratio
    }

    this.position -= input.length - 1
    this.lastSample = input[input.length - 1] ?? 0
    return outIdx === out.length ? out : out.subarray(0, outIdx)
  }
}
