// src/lib/sstv/vis.ts
import { goertzel } from './dsp'

export interface VisResult {
  /** 识别到的 VIS 码(8 bit,bit 7 = even parity over bits 0-6)。 */
  visCode: number
  /** VIS 结尾相对于最近一次 feed() 数据末尾往前偏移多少样本(>=0)。 */
  endOffset: number
}

const BIT_MS = 30

/**
 * SSTV VIS 头检测。标准协议:
 *   leader 1900Hz(>=300ms)→ break 1200Hz(~10ms)→ leader 1900Hz(~300ms)
 *   → start bit 1200Hz(30ms)→ 8 data bits LSB first(30ms each)
 *   → stop bit 1200Hz(30ms)
 *
 * 数据字节的 bit 7 是 even parity over bits 0-6(即 popcount(byte) 必须为偶数)。
 * Bit 频率约定:1100Hz = "1"(mark),1300Hz = "0"(space)。
 *
 * 实现:滑窗扫描,找 "leader 1900Hz 样本 + start bit 1200Hz 样本 + ..." 的核心段,
 * 噪声过滤靠能量比。每次 feed() 是非流式;调用方传入 ring 最近 ~500ms 即可
 * (VIS 核心 start→stop 约 300ms + 前置 leader 样本 30ms = 330ms)。
 */
export class VisDetector {
  private readonly bitSamples: number

  constructor(private readonly sampleRate: number) {
    this.bitSamples = Math.round((BIT_MS / 1000) * sampleRate)
  }

  reset(): void {
    // 无状态,空操作(预留给未来流式识别)
  }

  feed(samples: Float32Array): VisResult | null {
    const n = samples.length
    const bs = this.bitSamples

    const step = Math.max(1, Math.floor(bs / 4))
    // 从 bs 开始(s - bs >= 0);上界:start + 8 data + stop = 10 cells 从 s 开始 → s + 10*bs <= n
    for (let s = bs; s + 10 * bs <= n; s += step) {
      // leader 尾部(s 前一个 bit 窗口):1900 Hz 主导
      if (!isLeader1900(samples, s - bs, bs, this.sampleRate)) continue
      // start bit:1200 Hz 主导,且不被 1900 Hz(leader 边界)污染
      if (!isStartBit1200(samples, s, bs, this.sampleRate)) continue

      // 读 8 个 data bits(bit 7 = parity)
      let code = 0
      let ok = true
      for (let b = 0; b < 8; b++) {
        const off = s + (1 + b) * bs
        const is1 = bitValue(samples, off, bs, this.sampleRate)
        if (is1 === -1) {
          ok = false
          break
        }
        if (is1 === 1) code |= 1 << b
      }
      if (!ok) continue

      // Even parity check:popcount(code) 必须为偶数
      if (popcount(code) % 2 !== 0) continue

      // stop bit 在 s + 9*bs(跟在 8 个 data 之后)
      const stopOff = s + 9 * bs
      if (!isDominantTone(samples, stopOff, bs, 1200, this.sampleRate)) continue

      const endOffset = n - (stopOff + bs)
      return { visCode: code, endOffset: Math.max(0, endOffset) }
    }
    return null
  }
}

/** bit 判定:1100 Hz 能量 > 1300 Hz → 1(mark);反之 → 0(space);都弱 → -1(未决)。 */
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
  return e1100 > e1300 ? 1 : 0
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
  const offE = goertzel(win, hz + 500, sampleRate)
  return onE > offE * 3
}

function popcount(x: number): number {
  let n = 0
  let v = x
  while (v) {
    n += v & 1
    v >>>= 1
  }
  return n
}
