// src/lib/sstv/modes/types.ts

/** 跨行共享状态,交由 Mode 自己使用(Scottie 需要记 sync 锚点等)。 */
export type DecodeState = Record<string, unknown>

export interface Mode {
  /** 内部枚举值,和 SstvImage.mode 对应。 */
  name: 'robot36' | 'robot72' | 'martin-m1' | 'martin-m2' | 'pd120' | 'scottie-s1' | 'scottie-s2'
  /** UI 显示名。 */
  displayName: string
  /** VIS 码(8 bit)。 */
  visCode: number
  /** 图像总宽度(像素)。 */
  width: number
  /** 图像总高度(像素/行数)。 */
  height: number
  /**
   * 每个 "scan line"(音频侧的一段 sync 到下一段 sync)产生多少 image row。
   * - Robot / Martin / Scottie: 1
   * - PD: 2(Y1 + Cr + Cb + Y2 一段 sync 产两行)
   */
  rowsPerScanLine: number
  /** 一个 scan line 的音频时长(ms)。decoder 按这个推进。 */
  scanLineMs: number
  /**
   * VIS stop bit 之后到 row 0 真实开始之间的间隔(ms)。Scottie 协议在 VIS 后多发
   * 一个 9ms 1200Hz 起始 sync,decoder 切片时需要跳过这一段才能让 row 0 audio
   * 对齐到行结构(sep + G + sep + B + sync + porch + R)。
   * Robot/Martin/PD 没有这段,默认 0。
   */
  preludeMs?: number

  /**
   * 行解码。samples 包含 scan line + 可选 warmup 前缀(LPF 瞬态丢弃用)。
   * 返回 `width × rowsPerScanLine × 4` 字节的 RGBA(按图像行顺序拼接)。
   * state 用于跨 scan line 存状态(如 Robot36 的 4:2:0 色差)。
   * @param samples 此 scan line 的时间片(含 warmupSamples 前缀)
   * @param scanLineIndex 当前 scan line 序号(0..scanLineCount-1)
   * @param state 跨 scan line 可变状态,mode 自己负责读写
   * @param sampleRate 采样率
   * @param warmupSamples samples 起始处的 warmup 前缀长度。FM 解调后丢弃此长度,
   *   freq[0] 才对齐到 scan line 真实起点。0 表示无 warmup(测试 / 老接口兼容)
   */
  decodeLine(
    samples: Float32Array,
    scanLineIndex: number,
    state: DecodeState,
    sampleRate: number,
    warmupSamples?: number
  ): Uint8ClampedArray
}
