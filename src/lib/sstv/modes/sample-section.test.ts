import { describe, expect, it } from 'vitest'
import { sampleBrightnessSection } from './sample-section'

describe('sampleBrightnessSection', () => {
  it('不会把 section 前面的频率混进最左侧像素', () => {
    const sampleRate = 1000
    const freq = new Float32Array(30).fill(1500)
    freq.fill(2300, 10, 20)

    const out = sampleBrightnessSection(freq, sampleRate, 10, 20, 5)

    expect(out[0]).toBeGreaterThan(240)
  })

  it('不会把 section 后面的频率混进最右侧像素', () => {
    const sampleRate = 1000
    const freq = new Float32Array(30).fill(1500)
    freq.fill(2300, 10, 20)

    const out = sampleBrightnessSection(freq, sampleRate, 10, 20, 5)

    expect(out[4]).toBeGreaterThan(240)
  })

  it('Lanczos 在 PD120 场景下峰值比 box 更锐', () => {
    // 模拟 PD120 @8k 输入:freq 数组 8 样本一段(1ms = 8 样本),
    // 在 section 中间插入 3 个连续"白线"样本(2300Hz),周围 1500Hz。
    // box 窗口 max(4,1)=4 会把白线扩散开峰值衰减,Lanczos 在浮点位置上重建,
    // 峰值更接近原始 2300Hz → 亮度 255。
    const sampleRate = 8000
    const totalMs = 10
    const totalSamples = (totalMs * sampleRate) / 1000 // 80
    const freq = new Float32Array(totalSamples).fill(1500)
    freq.fill(2300, 38, 41)

    const boxOut = sampleBrightnessSection(freq, sampleRate, 0, totalMs, 80)
    const lanczosOut = sampleBrightnessSection(freq, sampleRate, 0, totalMs, 80, {
      useLanczos: true
    })

    const peakBox = Math.max(boxOut[38]!, boxOut[39]!, boxOut[40]!)
    const peakLanczos = Math.max(lanczosOut[38]!, lanczosOut[39]!, lanczosOut[40]!)
    // box 4-tap 平均会让峰值停在 ~191(2100Hz);Lanczos 应饱和到接近 255
    expect(peakLanczos).toBeGreaterThan(peakBox + 30)
    expect(peakLanczos).toBeGreaterThan(240)
  })

  it('Lanczos 常数输入返回常数(归一化权重)', () => {
    const sampleRate = 8000
    const freq = new Float32Array(80).fill(1900)
    const out = sampleBrightnessSection(freq, sampleRate, 0, 10, 80, { useLanczos: true })
    // 1900Hz 在 luminance 中点附近,容许 ±2 的 freqToBrightness 量化误差
    for (let i = 5; i < 75; i++) {
      expect(Math.abs(out[i]! - out[40]!)).toBeLessThan(3)
    }
  })
})
