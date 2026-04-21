// src/lib/sstv/vis.ts
import { goertzel } from './dsp'

export interface VisResult {
  /** 识别到的 VIS 码(8 bit)。奇偶校验不通过则不返回。 */
  visCode: number
  /** VIS 结尾相对于最近一次 feed() 数据末尾往前偏移多少样本(>=0)。
   *  decoder 用这个算出扫描起点 t0。 */
  endOffset: number
}

const BIT_MS = 30

/**
 * 朴素实现:每次 feed() 在样本里按固定 bit 长度滑窗扫描,找连续模式:
 *   [leader 1900Hz 持续 >=250ms] → [break 1200Hz ~10ms]
 *   [leader 1900Hz ~300ms] → [start 1200Hz 30ms]
 *   → [8 data bits 1100/1300 Hz 各 30ms] → [parity 1 bit] → [stop 1200Hz 30ms]
 *
 * 实际简化:直接定位"leader-start-8bits-parity-stop"的核心段(从第二次 1200 Hz
 * 开始数),鲁棒性够用,噪声过滤靠能量比。
 */
export class VisDetector {
  private readonly bitSamples: number

  constructor(private readonly sampleRate: number) {
    this.bitSamples = Math.round((BIT_MS / 1000) * sampleRate)
  }

  reset(): void {
    // 无状态,空操作(预留给将来做跨 feed 的流式识别)
  }

  /**
   * 在 `samples` 里找 VIS 头。目前是非流式实现:样本足够包含一整个 VIS 序列
   * 才能识别。调用方(decoder)每 rAF 传入 ring 最近 ~500ms 数据,VIS 总长 ~370ms
   * 所以 500ms 窗口够。
   */
  feed(samples: Float32Array): VisResult | null {
    const n = samples.length
    const bs = this.bitSamples

    // 扫描步长 = bs / 4(7.5ms),速度和精度折中
    const step = Math.max(1, Math.floor(bs / 4))
    // 从 bs 开始(确保 s - bs >= 0)
    // 上界: s + 11*bs <= n (start + 8 data + parity + stop = 11 bits 从 s 开始)
    for (let s = bs; s + 11 * bs <= n; s += step) {
      // 候选 start bit 位置 s:验证 s-bs 是 1900 Hz(leader 尾部)
      if (!isLeader1900(samples, s - bs, bs, this.sampleRate)) continue
      // start bit 必须清晰地是 1200 Hz,且不被 1900 Hz 污染
      // (防止扫描窗口落在 leader/start 边界混合区域)
      if (!isStartBit1200(samples, s, bs, this.sampleRate)) continue

      // 解 8 位 data
      let code = 0
      let parityOnes = 0
      let ok = true
      for (let b = 0; b < 8; b++) {
        const off = s + (1 + b) * bs
        const is1 = bitValue(samples, off, bs, this.sampleRate)
        if (is1 === -1) {
          ok = false
          break
        }
        if (is1 === 1) {
          code |= 1 << b
          parityOnes++
        }
      }
      if (!ok) continue

      // parity (偶校验)
      const parityOff = s + 9 * bs
      const pBit = bitValue(samples, parityOff, bs, this.sampleRate)
      if (pBit === -1) continue
      const expected = parityOnes % 2
      if (pBit !== expected) continue

      // stop bit:1200 Hz
      const stopOff = s + 10 * bs
      if (!isDominantTone(samples, stopOff, bs, 1200, this.sampleRate)) continue

      const endOffset = n - (stopOff + bs)
      return { visCode: code, endOffset: Math.max(0, endOffset) }
    }
    return null
  }
}

/** bit 判定:1300 Hz 能量 > 1100 Hz → 1;反之 → 0;都弱 → -1(未决)。 */
function bitValue(
  samples: Float32Array,
  start: number,
  length: number,
  sampleRate: number
): 0 | 1 | -1 {
  if (start + length > samples.length) return -1
  const win = samples.subarray(start, start + length)
  const e1100 = goertzel(win, 1100, sampleRate)
  const e1300 = goertzel(win, 1300, sampleRate)
  const max = Math.max(e1100, e1300)
  const noiseFloor = goertzel(win, 500, sampleRate)
  if (max < noiseFloor * 3) return -1
  return e1300 > e1100 ? 1 : 0
}

/** leader 检测:1900 Hz 能量必须主导(比 2400 Hz 高 3×)。 */
function isLeader1900(
  samples: Float32Array,
  start: number,
  length: number,
  sampleRate: number
): boolean {
  if (start < 0 || start + length > samples.length) return false
  const win = samples.subarray(start, start + length)
  const e1900 = goertzel(win, 1900, sampleRate)
  const e2400 = goertzel(win, 2400, sampleRate)
  return e1900 > e2400 * 3
}

/**
 * start bit / stop bit 检测:1200 Hz 必须同时主导 1700 Hz 和 1900 Hz。
 * 额外检测 1900 Hz 防止窗口落在 leader/start 边界混合区域时误判。
 */
function isStartBit1200(
  samples: Float32Array,
  start: number,
  length: number,
  sampleRate: number
): boolean {
  if (start < 0 || start + length > samples.length) return false
  const win = samples.subarray(start, start + length)
  const e1200 = goertzel(win, 1200, sampleRate)
  const e1700 = goertzel(win, 1700, sampleRate)
  const e1900 = goertzel(win, 1900, sampleRate)
  return e1200 > e1700 * 3 && e1200 > e1900 * 3
}

function isDominantTone(
  samples: Float32Array,
  start: number,
  length: number,
  hz: number,
  sampleRate: number
): boolean {
  if (start < 0 || start + length > samples.length) return false
  const win = samples.subarray(start, start + length)
  const onE = goertzel(win, hz, sampleRate)
  // 简单阈值:比一个无关频率(hz + 500)能量高 3×
  const offE = goertzel(win, hz + 500, sampleRate)
  return onE > offE * 3
}
