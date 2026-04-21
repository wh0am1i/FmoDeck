// src/lib/sstv/dsp.ts

/**
 * Goertzel 算子:在 `samples` 上评估 `targetHz` 处的能量(magnitude²)。
 * 比 FFT 便宜,单频点 O(N)。
 *
 * 使用任意频率(非 DFT 整数 bin)形式:omega = 2π·f/Fs,直接对任意目标频率有效,
 * 不受 N 长度限制。这一点对短窗(每像素 10-20 样本)必须如此,否则 k 量化后
 * bin 中心漂到目标频率外面。
 *
 * 返回值无归一化,只用于相对比较(见 vis.ts / estimateFreq)。
 */
export function goertzel(samples: Float32Array, targetHz: number, sampleRate: number): number {
  const omega = (2 * Math.PI * targetHz) / sampleRate
  const cosW = Math.cos(omega)
  const coeff = 2 * cosW

  let s0 = 0
  let s1 = 0
  let s2 = 0
  for (let i = 0; i < samples.length; i++) {
    s0 = (samples[i] ?? 0) + coeff * s1 - s2
    s2 = s1
    s1 = s0
  }
  // magnitude² = s1² + s2² - s1·s2·coeff
  return s1 * s1 + s2 * s2 - s1 * s2 * coeff
}

/**
 * 用 Goertzel bank 估计 `samples` 里主频率(Hz)。
 * 扫描 [minHz, maxHz] 范围,步长 `stepHz`,返回峰值附近用抛物线拟合
 * (三点:峰值 - 1、峰值、峰值 + 1)得到亚步长精度估计。
 *
 * 默认 stepHz=20,对 SSTV 1500-2300 范围足够(精度 ±10 Hz)。
 */
export function estimateFreq(
  samples: Float32Array,
  sampleRate: number,
  minHz: number,
  maxHz: number,
  stepHz = 20
): number {
  if (samples.length < 4) return (minHz + maxHz) / 2

  const bins = Math.floor((maxHz - minHz) / stepHz) + 1
  let peakI = 0
  let peakE = -1
  const energies = new Float32Array(bins)
  for (let i = 0; i < bins; i++) {
    const f = minHz + i * stepHz
    const e = goertzel(samples, f, sampleRate)
    energies[i] = e
    if (e > peakE) {
      peakE = e
      peakI = i
    }
  }

  // 抛物线拟合:y = a(x-x0)² + c,顶点 x0 = i + 0.5·(y₋₁ - y₊₁)/(y₋₁ - 2y₀ + y₊₁)
  if (peakI === 0 || peakI === bins - 1) {
    return minHz + peakI * stepHz
  }
  const yM = energies[peakI - 1]!
  const y0 = energies[peakI]!
  const yP = energies[peakI + 1]!
  const denom = yM - 2 * y0 + yP
  const offset = denom === 0 ? 0 : (0.5 * (yM - yP)) / denom
  return minHz + (peakI + offset) * stepHz
}

/** SSTV 标准:1500 Hz = 0(黑),2300 Hz = 255(白),线性映射,越界截断。 */
export function freqToBrightness(freqHz: number): number {
  const clamped = Math.max(1500, Math.min(2300, freqHz))
  return Math.round(((clamped - 1500) / 800) * 255)
}

/**
 * 把实信号通过复数 mixer @ centerHz + Butterworth LPF @ cutoffHz 得到
 * analytic signal 的 I/Q 分量。
 *
 * 用于 FM 相位解调:SSTV 信号在 1500-2300 Hz 窄带,中心 1900 Hz;
 * mixer 把它搬到基带(-400~+400 Hz),LPF 滤掉 2×fc 镜像和带外噪声。
 */
export function toAnalytic(
  samples: Float32Array,
  sampleRate: number,
  centerHz = 1900,
  cutoffHz = 600
): { i: Float32Array; q: Float32Array } {
  const n = samples.length
  const i = new Float32Array(n)
  const q = new Float32Array(n)

  const omegaC = (2 * Math.PI * centerHz) / sampleRate
  for (let k = 0; k < n; k++) {
    const phase = omegaC * k
    i[k] = (samples[k] ?? 0) * Math.cos(phase)
    q[k] = -(samples[k] ?? 0) * Math.sin(phase)
  }

  // Butterworth LPF (Q=1/sqrt(2)),用单个 biquad,24 dB/octave 对 3800Hz 镜像已足够
  const omega = (2 * Math.PI * cutoffHz) / sampleRate
  const alpha = Math.sin(omega) / (2 * Math.SQRT1_2)
  const cosW = Math.cos(omega)
  const a0 = 1 + alpha
  const b0 = (1 - cosW) / 2 / a0
  const b1 = (1 - cosW) / a0
  const b2 = b0
  const a1 = (-2 * cosW) / a0
  const a2 = (1 - alpha) / a0

  applyBiquad(i, b0, b1, b2, a1, a2)
  applyBiquad(q, b0, b1, b2, a1, a2)
  return { i, q }
}

function applyBiquad(
  x: Float32Array,
  b0: number,
  b1: number,
  b2: number,
  a1: number,
  a2: number
): void {
  let x1 = 0
  let x2 = 0
  let y1 = 0
  let y2 = 0
  for (let n = 0; n < x.length; n++) {
    const xn = x[n] ?? 0
    const yn = b0 * xn + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2
    x2 = x1
    x1 = xn
    y2 = y1
    y1 = yn
    x[n] = yn
  }
}

/**
 * 瞬时频率估计(Hz):f[k] = centerHz + Fs/(2π) · arg(z[k] · conj(z[k-1]))
 *
 * arg(z[k] · conj(z[k-1])) = atan2(q[k]*i[k-1] - i[k]*q[k-1], i[k]*i[k-1] + q[k]*q[k-1])
 *
 * 返回长度同 i/q 的 Float32Array,每个元素是该样本的瞬时频率(Hz)。
 * f[0] 无法算(缺前一样本),填 centerHz。
 *
 * 注意:调用方通常要丢弃前若干样本(LPF 瞬态期,~50 样本 @ cutoff=600Hz/Fs=48k)。
 */
export function instantFreq(
  i: Float32Array,
  q: Float32Array,
  sampleRate: number,
  centerHz = 1900
): Float32Array {
  const n = i.length
  const out = new Float32Array(n)
  out[0] = centerHz
  const scale = sampleRate / (2 * Math.PI)
  for (let k = 1; k < n; k++) {
    const re = (i[k] ?? 0) * (i[k - 1] ?? 0) + (q[k] ?? 0) * (q[k - 1] ?? 0)
    const im = (q[k] ?? 0) * (i[k - 1] ?? 0) - (i[k] ?? 0) * (q[k - 1] ?? 0)
    out[k] = centerHz + scale * Math.atan2(im, re)
  }
  return out
}
