// src/lib/sstv/modes/types.ts

/** 跨行共享状态,交由 Mode 自己使用(Scottie 需要记 sync 锚点等)。 */
export type DecodeState = Record<string, unknown>

export interface Mode {
  /** 内部枚举值,和 SstvImage.mode 对应。 */
  name: 'robot36' | 'martin-m1' | 'martin-m2'
  /** UI 显示名。 */
  displayName: string
  /** VIS 码(8 bit)。 */
  visCode: number
  /** 图像尺寸。 */
  width: number
  height: number
  /** 一行时间窗(ms)。 */
  lineMs: number

  /**
   * 行解码。
   * @param samples 此行对应的时间片(长度 ≈ lineMs × sampleRate / 1000)
   * @param row 当前行号(0..height-1)
   * @param state 跨行可变状态,mode 自己负责读写
   * @param sampleRate 采样率
   * @returns 长度 width × 4 的 RGBA 像素数据
   */
  decodeLine(
    samples: Float32Array,
    row: number,
    state: DecodeState,
    sampleRate: number
  ): Uint8ClampedArray
}
