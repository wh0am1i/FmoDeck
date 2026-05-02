// src/lib/sstv/decoder.ts
import { FM_WARMUP_MS } from './dsp'
import { VisDetector } from './vis'
import { modeRegistry } from './modes/registry'
import type { Mode, DecodeState } from './modes/types'
import type { PcmTap } from './pcm-tap'

const CALIBRATION_ROWS = 10 // 首次校准:收满 10 行算一次 slant
const RECALIBRATE_ROWS = 20 // 锁定后每 20 行把残差斜率累加到 slant,跟踪非线性漂移
const SLANT_CLAMP_MS = 5 // 斜率钳制(±5 ms/scan line,留给真实极端漂移更多裕量)
const SLANT_FILTER_MS = 25 // 收集 raw sync 用于 slant 校准时的过滤上限(远大于预期漂移,Theil-Sen 自己抗异常)
const VIS_LOOKBACK_MS = 1200 // 完整 VIS 前导(300+10+300ms) + bits/stop 约 940ms,取 1.2s 留余量
const SILENT_ABORT_MS = 5000 // 连续静音超过 5 秒视为信号中断弃帧;按时间而非行数,
                              // 避免长行 mode(如 PD120 每行 508ms)被网络抖动误判

interface SyncSample {
  scanLine: number
  rawMs: number
}

export type DecoderState =
  | { type: 'idle' }
  | {
      type: 'decoding'
      mode: Mode
      t0: number
      nextScanLine: number
      decodeState: DecodeState
      /** 最近一段连续静音的累计时长(ms),按 mode.scanLineMs 累加,非静音重置为 0 */
      silentMsStreak: number
      syncSamples: SyncSample[]
      slantMsPerScanLine: number
      slantCalibrated: boolean
    }

export interface PartialFrame {
  mode: Mode
  rgba: Uint8ClampedArray
  /** 已完成的 scan line 数(每个 scan line 含 mode.rowsPerScanLine 个 image row) */
  completedScanLines: number
  /** 该 mode 总 scan line 数 */
  totalScanLines: number
}

export interface DecoderEvents {
  /** 每解出一行触发,UI 用来渐进画 canvas。 */
  onRow?: (row: number, rgba: Uint8ClampedArray, mode: Mode) => void
  /** 整帧完成。rgba 是每行拼起来的 width × height × 4。 */
  onDone?: (result: { mode: Mode; rgba: Uint8ClampedArray }) => void | Promise<void>
  /**
   * 超时。partial 非 null 时表示有残图(已成功解出 ≥1 个 scan line),UI 可标注
   * 「未完整 N/M」并继续显示。partial=null 表示一行都没解出来,直接清空。
   */
  onTimeout?: (partial: PartialFrame | null) => void
  /** 进入 decoding 状态,UI 可用于分配 canvas。 */
  onStart?: (mode: Mode) => void
}

/**
 * SSTV 状态机。不持有 AudioNode / DOM,纯数据驱动:
 * 每次 `tick(tap)` 根据当前 tap 内样本推进 VIS 检测 / 逐行解码。
 *
 * idle:VIS 扫描最近 1.2s,找到 → decoding
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

  /**
   * 跳过 VIS,强制按指定 mode 从 N 秒前开始解码。VIS fade / mode 不识别时的救场入口。
   *
   * @param visCode 要按哪个 mode 解码
   * @param fromSamplesAgo 起点距 tap.totalWritten 多少样本(由 caller 按当前 sampleRate 算)
   * @param tap 用于读取 totalWritten,实际取样在后续 tick 里 slice
   * @returns true=已切换到 decoding,false=mode 未注册或当前不在 idle 状态
   */
  forceStart(visCode: number, fromSamplesAgo: number, tap: PcmTap): boolean {
    if (this.state.type !== 'idle') return false
    const mode = modeRegistry.get(visCode)
    if (!mode) return false
    const preludeSamples = Math.round(((mode.preludeMs ?? 0) * this.sampleRate) / 1000)
    const t0 = tap.totalWritten - fromSamplesAgo + preludeSamples
    this.state = {
      type: 'decoding',
      mode,
      t0,
      nextScanLine: 0,
      decodeState: {},
      silentMsStreak: 0,
      syncSamples: [],
      slantMsPerScanLine: 0,
      slantCalibrated: false
    }
    this.fullRgba = new Uint8ClampedArray(mode.width * mode.height * 4)
    this.events.onStart?.(mode)
    return true
  }

  tick(tap: PcmTap): void {
    if (this.state.type === 'idle') {
      const recent = tap.recent(VIS_LOOKBACK_MS, this.sampleRate)
      const result = this.visDetector.feed(recent)
      if (!result) return
      const mode = modeRegistry.get(result.visCode)
      if (!mode) {
        console.debug(`[sstv] 未支持的 VIS 码:0x${result.visCode.toString(16)}`)
        return
      }
      // t0 = VIS stop 之后 + preludeMs(Scottie 跳 9ms starting sync)
      const preludeSamples = Math.round(((mode.preludeMs ?? 0) * this.sampleRate) / 1000)
      const t0 = tap.totalWritten - result.endOffset + preludeSamples
      this.state = {
        type: 'decoding',
        mode,
        t0,
        nextScanLine: 0,
        decodeState: {},
        silentMsStreak: 0,
        syncSamples: [],
        slantMsPerScanLine: 0,
        slantCalibrated: false
      }
      this.fullRgba = new Uint8ClampedArray(mode.width * mode.height * 4)
      this.events.onStart?.(mode)
      return
    }

    // decoding
    const { mode, t0, decodeState } = this.state
    const baseRowSamples = Math.round((mode.scanLineMs * this.sampleRate) / 1000)
    // FM 解调 LPF 瞬态丢弃:每行多切前缀 ~5ms,decodeLine 内部 trim 掉
    const warmupSamples = Math.round((FM_WARMUP_MS * this.sampleRate) / 1000)
    // 关键:每行漂移 slantMsPerScanLine 在 8kHz 下常常 < 0.0625ms(半个采样间隔),
    // 如果先把每行的 slant 单独 round 到样本再乘行号,sub-sample 漂移永远是 0。
    // 对 Martin M2 这种 256 行长图,0.05ms/line 的微漂经 256 行就累到 12.8ms/~56px,
    // 表现为全图对角剪切。正确做法:以浮点累加到 nextScanLine * (base + slant),
    // 最后再 round 一次。
    const effectiveRowSamplesFloat =
      ((mode.scanLineMs + this.state.slantMsPerScanLine) * this.sampleRate) / 1000

    const elapsedSamples = tap.totalWritten - t0
    const elapsedMs = (elapsedSamples / this.sampleRate) * 1000
    const targetScanLine = Math.floor(elapsedMs / mode.scanLineMs)
    const scanLineCount = mode.height / mode.rowsPerScanLine

    while (this.state.nextScanLine < Math.min(targetScanLine, scanLineCount)) {
      const scanLineStart =
        t0 + Math.round(this.state.nextScanLine * effectiveRowSamplesFloat)
      // 往前借 warmup 前缀(从上一行末尾或 VIS 尾切)。tap 容量 3s 足以覆盖。
      // 若 tap 还没回卷到 warmup 之前,actualWarmup 退化为 0(罕见,仅极首帧)。
      const oldest = Math.max(0, tap.totalWritten - tap.capacity)
      const actualWarmup = Math.max(0, Math.min(warmupSamples, scanLineStart - oldest))
      const samples = tap.slice(scanLineStart - actualWarmup, baseRowSamples + actualWarmup)
      if (!samples) break

      // 静音检测:连续静音超过 SILENT_ABORT_MS 视为信号中断弃帧。
      // 按时间累加(scanLineMs)而非行数 —— PD120 单行 508ms,5 行就 2.5s,
      // 短暂网络抖动也会误判;改成 5 秒后所有 mode 的容忍度一致。
      const rms = computeRms(samples)
      if (rms < 0.01) {
        this.state.silentMsStreak += mode.scanLineMs
        if (this.state.silentMsStreak >= SILENT_ABORT_MS) {
          this.emitTimeout(mode, this.state.nextScanLine, scanLineCount)
          return
        }
      } else {
        this.state.silentMsStreak = 0
      }

      const rgba = mode.decodeLine(
        samples,
        this.state.nextScanLine,
        decodeState,
        this.sampleRate,
        actualWarmup
      )

      // 收集 raw sync 用于时基跟踪。
      // 关键:要连同 scan line 序号一起保存。live 信号里可能会漏掉若干行的 sync 检测，
      // 如果只存 raw 值再按数组相邻位置算 slope，会把“隔了 3 行”的漂移误当成“隔 1 行”。
      //
      // 两阶段:
      // 1. 前 10 行一次性 Theil-Sen 标定 slant。
      // 2. 锁定后仍继续收 raw,每 20 行把本批的 Theil-Sen 斜率作为「残差」
      //    加到现有 slant 上 —— 本批所有样本都是在相同 slant 下测的,
      //    斜率直接代表"目前 slant 还差多少"。每次累加完清空 buffer,
      //    保证下一批的基线一致,避免跨批次混淆(即之前 Robot72 rolling 的锅)。
      //    对 Martin M2(256 行)这种长图,非线性漂移在下半段会累积。
      // 注:sync 未检测到时 lastRawSyncMs 写 NaN,所以这里要用 Number.isFinite
      // 过滤。不能用 rawMs !== 0,否则对齐良好时合法的 0 值会被丢掉,
      // 残差 Theil-Sen 就永远攒不够样本触发重校准。
      const rawMs = (decodeState as { lastRawSyncMs?: number }).lastRawSyncMs
      if (
        rawMs !== undefined &&
        Number.isFinite(rawMs) &&
        Math.abs(rawMs) <= SLANT_FILTER_MS
      ) {
        this.state.syncSamples.push({
          scanLine: this.state.nextScanLine,
          rawMs
        })
        if (!this.state.slantCalibrated) {
          if (this.state.syncSamples.length >= CALIBRATION_ROWS) {
            this.state.slantMsPerScanLine = theilSenSlope(this.state.syncSamples)
            this.state.slantCalibrated = true
            this.state.syncSamples = []
          }
        } else if (this.state.syncSamples.length >= RECALIBRATE_ROWS) {
          const residual = theilSenSlope(this.state.syncSamples)
          this.state.slantMsPerScanLine = Math.max(
            -SLANT_CLAMP_MS,
            Math.min(SLANT_CLAMP_MS, this.state.slantMsPerScanLine + residual)
          )
          this.state.syncSamples = []
        }
      }

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
      this.emitTimeout(mode, this.state.nextScanLine, scanLineCount)
    }
  }

  private emitTimeout(mode: Mode, completedScanLines: number, totalScanLines: number): void {
    const partialRgba = this.fullRgba
    this.state = { type: 'idle' }
    this.fullRgba = null
    if (partialRgba && completedScanLines > 0) {
      this.events.onTimeout?.({
        mode,
        rgba: partialRgba,
        completedScanLines,
        totalScanLines
      })
    } else {
      this.events.onTimeout?.(null)
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

/**
 * Theil-Sen 估计:所有点对 slope 取中位数。
 * 对异常值鲁棒,击穿点 29%(即使 29% 样本是异常值仍收敛到真值)。
 */
function theilSenSlope(samples: SyncSample[]): number {
  if (samples.length < 2) return 0
  const slopes: number[] = []
  for (let i = 0; i < samples.length; i++) {
    for (let j = i + 1; j < samples.length; j++) {
      const lineDelta = samples[j]!.scanLine - samples[i]!.scanLine
      if (lineDelta === 0) continue
      slopes.push((samples[j]!.rawMs - samples[i]!.rawMs) / lineDelta)
    }
  }
  if (slopes.length === 0) return 0
  slopes.sort((a, b) => a - b)
  const median = slopes[Math.floor(slopes.length / 2)]!
  return Math.max(-SLANT_CLAMP_MS, Math.min(SLANT_CLAMP_MS, median))
}
