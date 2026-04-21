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
      nextScanLine: number
      decodeState: DecodeState
      silentRowsStreak: number
    }

export interface DecoderEvents {
  /** 每解出一行触发,UI 用来渐进画 canvas。 */
  onRow?: (row: number, rgba: Uint8ClampedArray, mode: Mode) => void
  /** 整帧完成。rgba 是每行拼起来的 width × height × 4。 */
  onDone?: (result: { mode: Mode; rgba: Uint8ClampedArray }) => void | Promise<void>
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
 * decoding:按 t0 和 mode.scanLineMs 推进 nextScanLine,解一个 scan line 回调若干次;
 *           全部行完 → done 回调 → idle
 *           超时(>scanLineMs*scanLineCount*1.1) → timeout 回调 → idle
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
        console.debug(`[sstv] 未支持的 VIS 码:0x${result.visCode.toString(16)}`)
        return
      }
      // t0 = VIS 结束时的逻辑样本 index
      const t0 = tap.totalWritten - result.endOffset
      this.state = {
        type: 'decoding',
        mode,
        t0,
        nextScanLine: 0,
        decodeState: {},
        silentRowsStreak: 0
      }
      this.fullRgba = new Uint8ClampedArray(mode.width * mode.height * 4)
      this.events.onStart?.(mode)
      return
    }

    // decoding
    const { mode, t0, decodeState } = this.state
    const rowSamples = Math.round((mode.scanLineMs * this.sampleRate) / 1000)
    const elapsedSamples = tap.totalWritten - t0
    const elapsedMs = (elapsedSamples / this.sampleRate) * 1000
    const targetScanLine = Math.floor(elapsedMs / mode.scanLineMs)
    const scanLineCount = mode.height / mode.rowsPerScanLine

    while (this.state.nextScanLine < Math.min(targetScanLine, scanLineCount)) {
      const scanLineStart = t0 + this.state.nextScanLine * rowSamples
      const samples = tap.slice(scanLineStart, rowSamples)
      if (!samples) break

      // 静音检测:若连续 5 次 RMS < 阈值,视为信号中断,abort
      const rms = computeRms(samples)
      if (rms < 0.01) {
        this.state.silentRowsStreak++
        if (this.state.silentRowsStreak >= 5) {
          this.state = { type: 'idle' }
          this.fullRgba = null
          this.events.onTimeout?.()
          return
        }
      } else {
        this.state.silentRowsStreak = 0
      }

      const rgba = mode.decodeLine(samples, this.state.nextScanLine, decodeState, this.sampleRate)
      // rgba 长度 = width × rowsPerScanLine × 4
      // 写入 fullRgba 起始偏移 = (nextScanLine × rowsPerScanLine) × width × 4
      const firstImageRow = this.state.nextScanLine * mode.rowsPerScanLine
      this.fullRgba?.set(rgba, firstImageRow * mode.width * 4)
      // 每个 image row 触发 onRow
      for (let r = 0; r < mode.rowsPerScanLine; r++) {
        const rowRgba = rgba.subarray(r * mode.width * 4, (r + 1) * mode.width * 4)
        void this.events.onRow?.(firstImageRow + r, new Uint8ClampedArray(rowRgba), mode)
      }

      this.state.nextScanLine++
    }

    if (this.state.nextScanLine >= scanLineCount) {
      const rgba = this.fullRgba!
      const doneMode = mode
      this.state = { type: 'idle' }
      this.fullRgba = null
      void this.events.onDone?.({ mode: doneMode, rgba })
      return
    }

    if (elapsedMs > mode.scanLineMs * scanLineCount * 1.1) {
      this.state = { type: 'idle' }
      this.fullRgba = null
      this.events.onTimeout?.()
    }
  }
}

function computeRms(samples: Float32Array): number {
  if (samples.length === 0) return 0
  let sumSq = 0
  for (const s of samples) {
    sumSq += s * s
  }
  return Math.sqrt(sumSq / samples.length)
}
