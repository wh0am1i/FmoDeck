// src/lib/sstv/decoder.ts
import { VisDetector } from './vis'
import { modeRegistry } from './modes/registry'
import type { Mode, DecodeState } from './modes/types'
import type { PcmTap } from './pcm-tap'

export type DecoderState =
  | { type: 'idle' }
  | {
      type: 'decoding'
      mode: Mode
      t0: number
      nextRow: number
      decodeState: DecodeState
    }

export interface DecoderEvents {
  /** 每解出一行触发,UI 用来渐进画 canvas。 */
  onRow?: (row: number, rgba: Uint8ClampedArray, mode: Mode) => void
  /** 整帧完成。rgba 是每行拼起来的 width × height × 4。 */
  onDone?: (result: { mode: Mode; rgba: Uint8ClampedArray }) => void
  /** 超时弃帧。 */
  onTimeout?: () => void
  /** 进入 decoding 状态,UI 可用于分配 canvas。 */
  onStart?: (mode: Mode) => void
}

/**
 * SSTV 状态机。不持有 AudioNode / DOM,纯数据驱动:
 * 每次 `tick(tap)` 根据当前 tap 内样本推进 VIS 检测 / 逐行解码。
 *
 * idle:VIS 扫描最近 500ms,找到 → decoding
 * decoding:按 t0 和 mode.lineMs 推进 nextRow,解一行回调一次;
 *           全部行完 → done 回调 → idle
 *           超时(>lineMs*height*1.1) → timeout 回调 → idle
 */
export class SstvDecoder {
  state: DecoderState = { type: 'idle' }

  private readonly visDetector: VisDetector
  private fullRgba: Uint8ClampedArray | null = null

  constructor(
    private readonly sampleRate: number,
    private readonly events: DecoderEvents = {}
  ) {
    this.visDetector = new VisDetector(sampleRate)
  }

  reset(): void {
    this.state = { type: 'idle' }
    this.fullRgba = null
    this.visDetector.reset()
  }

  tick(tap: PcmTap): void {
    if (this.state.type === 'idle') {
      const recent = tap.recent(500, this.sampleRate)
      const result = this.visDetector.feed(recent)
      if (!result) return
      const mode = modeRegistry.get(result.visCode)
      if (!mode) {
        // eslint-disable-next-line no-console
        console.debug(`[sstv] 未支持的 VIS 码:0x${result.visCode.toString(16)}`)
        return
      }
      // t0 = VIS 结束时的逻辑样本 index
      const t0 = tap.totalWritten - result.endOffset
      this.state = {
        type: 'decoding',
        mode,
        t0,
        nextRow: 0,
        decodeState: {}
      }
      this.fullRgba = new Uint8ClampedArray(mode.width * mode.height * 4)
      this.events.onStart?.(mode)
      return
    }

    // decoding
    const { mode, t0, decodeState } = this.state
    const rowSamples = Math.round((mode.lineMs * this.sampleRate) / 1000)
    const elapsedSamples = tap.totalWritten - t0
    const elapsedMs = (elapsedSamples / this.sampleRate) * 1000
    const targetRow = Math.floor(elapsedMs / mode.lineMs)

    while (this.state.nextRow < Math.min(targetRow, mode.height)) {
      const rowStart = t0 + this.state.nextRow * rowSamples
      const samples = tap.slice(rowStart, rowSamples)
      if (!samples) break
      const rgba = mode.decodeLine(samples, this.state.nextRow, decodeState, this.sampleRate)
      this.fullRgba?.set(rgba, this.state.nextRow * mode.width * 4)
      this.events.onRow?.(this.state.nextRow, rgba, mode)
      this.state.nextRow++
    }

    if (this.state.nextRow === mode.height) {
      const rgba = this.fullRgba!
      const doneMode = mode
      this.state = { type: 'idle' }
      this.fullRgba = null
      this.events.onDone?.({ mode: doneMode, rgba })
      return
    }

    if (elapsedMs > mode.lineMs * mode.height * 1.1) {
      this.state = { type: 'idle' }
      this.fullRgba = null
      this.events.onTimeout?.()
    }
  }
}
