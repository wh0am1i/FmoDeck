import { LinearPcmResampler } from './linear-resampler'
import { PcmTap } from './pcm-tap'

export interface TickDrivenDecoder {
  tick: (tap: PcmTap) => void
}

export class LivePcmPump {
  private readonly _tap: PcmTap
  private resampler: LinearPcmResampler | null = null
  private resamplerSourceRate: number | null = null

  constructor(
    private readonly targetSampleRate: number,
    private readonly decoder: TickDrivenDecoder,
    capacitySeconds = 3
  ) {
    this._tap = new PcmTap(Math.round(targetSampleRate * capacitySeconds))
  }

  get tap(): PcmTap {
    return this._tap
  }

  get sampleRate(): number {
    return this.targetSampleRate
  }

  push(chunk: Float32Array, sourceSampleRate: number): void {
    const normalized =
      sourceSampleRate === this.targetSampleRate
        ? chunk
        : this.getResampler(sourceSampleRate).process(chunk)
    if (normalized.length === 0) return
    this._tap.write(normalized)
    this.decoder.tick(this._tap)
  }

  private getResampler(sourceSampleRate: number): LinearPcmResampler {
    if (!this.resampler || this.resamplerSourceRate !== sourceSampleRate) {
      this.resampler = new LinearPcmResampler(sourceSampleRate, this.targetSampleRate)
      this.resamplerSourceRate = sourceSampleRate
    }
    return this.resampler
  }
}
