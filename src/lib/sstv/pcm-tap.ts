// src/lib/sstv/pcm-tap.ts

/**
 * 环形缓冲:按"逻辑时间戳"(totalWritten 单调递增)访问,可回溯 capacity 长度。
 *
 * 使用:
 *   每 rAF 调 pullFromAnalyser(analyser) 或 write(chunk)。
 *   decoder 用 slice(logicalOffset, length) 按"第几行需要哪段样本"取。
 *   recent(ms, sr) 方便 VIS 扫描"最近 N 毫秒"。
 */
export class PcmTap {
  private readonly buf: Float32Array
  private writeIdx = 0
  private _totalWritten = 0
  /** 上次拉取时的 AudioContext.currentTime(秒);-1 表示首次。 */
  private lastCtxTime = -1

  constructor(capacity: number) {
    this.buf = new Float32Array(capacity)
  }

  get totalWritten(): number {
    return this._totalWritten
  }

  get capacity(): number {
    return this.buf.length
  }

  /**
   * 从 AnalyserNode 拉最近到达的样本并追加。
   *
   * 关键:analyser.getFloatTimeDomainData 返回永远是"最近 fftSize 个样本"的滚动快照。
   * rAF(~60Hz)每次取 2048 样本,里面大部分是上次已写过的,如果整块都写就会让
   * tap.totalWritten 按 fftSize/rAF 间隔 倍速前进(~2.67×),decoder 时间轴失真。
   *
   * 修法:用 **AudioContext.currentTime** 做时钟源(音频处理时钟,而不是 wall-clock
   * performance.now)。两次拉取之间 ctx 前进了 Δt 秒,就写入 Δt×sampleRate 个最新样本。
   * ctx 被浏览器挂起时 currentTime 不前进,tap 也不增长——自然对齐音频真实产出。
   */
  pullFromAnalyser(analyser: AnalyserNode): void {
    const chunk = new Float32Array(analyser.fftSize)
    analyser.getFloatTimeDomainData(chunk)

    const ctx = analyser.context
    const sampleRate = ctx.sampleRate
    const ctxTime = ctx.currentTime // 秒

    let writeCount: number
    if (this.lastCtxTime < 0) {
      // 首次:写整块,建立时间基准
      writeCount = chunk.length
    } else {
      const elapsedSec = ctxTime - this.lastCtxTime
      if (elapsedSec <= 0) {
        // ctx 挂起 / 时钟未前进 → 不写
        this.lastCtxTime = ctxTime
        return
      }
      const expected = Math.round(elapsedSec * sampleRate)
      // 钳制:不能比 analyser 缓冲长(超过说明 rAF 被 throttle 了,丢失的音频无法补)
      writeCount = Math.min(chunk.length, Math.max(1, expected))
    }
    this.lastCtxTime = ctxTime

    if (writeCount === chunk.length) {
      this.write(chunk)
    } else {
      this.write(chunk.subarray(chunk.length - writeCount))
    }
  }

  write(chunk: Float32Array): void {
    const cap = this.buf.length
    for (const s of chunk) {
      this.buf[this.writeIdx] = s
      this.writeIdx = (this.writeIdx + 1) % cap
    }
    this._totalWritten += chunk.length
  }

  /**
   * 取逻辑偏移 [offset, offset+length) 的样本。
   * 如果范围内有任何样本还没写入或已被覆盖,返回 null。
   */
  slice(logicalOffset: number, length: number): Float32Array | null {
    if (length <= 0) return new Float32Array(0)
    const end = logicalOffset + length
    const oldest = Math.max(0, this._totalWritten - this.buf.length)
    if (logicalOffset < oldest) return null
    if (end > this._totalWritten) return null

    const out = new Float32Array(length)
    const cap = this.buf.length
    // writeIdx 指向"下一个要写的位置",即逻辑位置 totalWritten
    // 逻辑位置 L 对应物理索引 (writeIdx - (totalWritten - L) + cap) % cap
    const startPhys = (this.writeIdx - (this._totalWritten - logicalOffset) + cap) % cap
    for (let i = 0; i < length; i++) {
      out[i] = this.buf[(startPhys + i) % cap]!
    }
    return out
  }

  /** 最近 durationMs 毫秒的样本(长度 = round(ms × sr / 1000))。 */
  recent(durationMs: number, sampleRate: number): Float32Array {
    const need = Math.round((durationMs / 1000) * sampleRate)
    const offset = Math.max(0, this._totalWritten - need)
    const actual = this._totalWritten - offset
    return this.slice(offset, actual) ?? new Float32Array(0)
  }
}
