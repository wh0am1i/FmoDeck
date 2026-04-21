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

  constructor(capacity: number) {
    this.buf = new Float32Array(capacity)
  }

  get totalWritten(): number {
    return this._totalWritten
  }

  get capacity(): number {
    return this.buf.length
  }

  /** 从 AnalyserNode 拉最近一窗(fftSize 个样本)并追加。 */
  pullFromAnalyser(analyser: AnalyserNode): void {
    const chunk = new Float32Array(analyser.fftSize)
    analyser.getFloatTimeDomainData(chunk)
    this.write(chunk)
  }

  write(chunk: Float32Array): void {
    const cap = this.buf.length
    for (let i = 0; i < chunk.length; i++) {
      this.buf[this.writeIdx] = chunk[i]!
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
