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
  /** 上次从 analyser 拉取的 wall-clock 时刻(performance.now ms);0 表示首次。 */
  private lastPullMs = 0

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
   * 注意:analyser.getFloatTimeDomainData 返回的永远是"最近 fftSize 个样本"
   * 的滚动快照。rAF 以 60Hz 触发(~16ms 间隔),每次取 fftSize 会包含大量
   * 上次已经写入的重复样本。如果把整块都写进 tap,totalWritten 会按
   * fftSize/rAF 间隔 的倍数倍速前进(比如 48k/2048 fftSize 下 ~2.67×),
   * decoder 的时间轴就失真,图像解码错位 + VIS 检测失败。
   *
   * 修法:按 wall-clock 差值计算"自上次拉取以来产生了多少新样本",
   * 只写 chunk 末尾的那部分(analyser 最新的 N 个样本),把中间重复的丢掉。
   * 首次拉取无基准时写整块(作为起始填充)。
   */
  pullFromAnalyser(analyser: AnalyserNode): void {
    const chunk = new Float32Array(analyser.fftSize)
    analyser.getFloatTimeDomainData(chunk)

    const sampleRate = analyser.context.sampleRate
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now()

    let writeCount: number
    if (this.lastPullMs === 0) {
      // 首次:写整块,建立时间基准
      writeCount = chunk.length
    } else {
      const elapsedMs = now - this.lastPullMs
      const expected = Math.round((elapsedMs * sampleRate) / 1000)
      // 钳制:不能比 analyser 缓冲长(超过就说明 rAF 被 throttle 了,丢失的音频无法补),
      // 也不能为 0(保证至少写 1 样本推进时间轴)
      writeCount = Math.min(chunk.length, Math.max(1, expected))
    }
    this.lastPullMs = now

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
