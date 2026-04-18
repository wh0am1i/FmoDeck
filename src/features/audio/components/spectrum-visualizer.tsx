import { useEffect, useRef } from 'react'
import { audioStore } from '../store'
import { engineRefStore } from '../engine-store'

interface Props {
  /** 渲染像素高度（CSS 像素，内部乘 DPR） */
  height?: number
  /** 柱数。48 在语音带上既有细节又不过密。 */
  bars?: number
  /** 只显示 0 – maxFreqHz 的 FFT bins（FMO 语音带 3.5kHz 封顶） */
  maxFreqHz?: number
  /** EMA 平滑系数 0~1，越小越丝滑 */
  smoothing?: number
  /** 单柱间距（px） */
  gap?: number
  /** 是否画柱体下方的镜像反射（镜像 + 透明衰减），开更炫 */
  mirror?: boolean
  /** 峰值保持：每柱顶部画一个小横条，缓慢下落 */
  peakHold?: boolean
  /** 背景栅格（HUD 气质） */
  grid?: boolean
  className?: string
}

// HUD 主题三色（冷蓝 / 琥珀 / 品红），与全局 CSS var 对齐
const C_COLD = 'rgba(0, 217, 255, 1)' // primary #00D9FF
const C_WARM = 'rgba(255, 176, 0, 1)' // accent  #FFB000
const C_HOT = 'rgba(255, 62, 92, 1)' // destructive #FF3E5C
const C_BASE = 'rgba(0, 217, 255, 0.2)' // 底座色，信号弱时的残影

export function SpectrumVisualizer({
  height = 72,
  bars = 48,
  maxFreqHz = 3500,
  smoothing = 0.28,
  gap = 2,
  mirror = false,
  peakHold = false,
  grid = false,
  className
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engine = engineRefStore((s) => s.engine)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !engine) return
    const analyser = engine.getAnalyser()
    if (!analyser) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // DPR 适配
    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      const cssWidth = canvas.clientWidth
      canvas.width = Math.max(1, Math.floor(cssWidth * dpr))
      canvas.height = Math.max(1, Math.floor(height * dpr))
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    const resizeObs = new ResizeObserver(resize)
    resizeObs.observe(canvas)

    const freqData = new Uint8Array(analyser.frequencyBinCount)
    const sampleRate = analyser.context.sampleRate
    // 只取前 maxFreqHz 对应的 bins
    const maxBin = Math.max(
      1,
      Math.min(
        analyser.frequencyBinCount,
        Math.ceil((maxFreqHz / (sampleRate / 2)) * analyser.frequencyBinCount)
      )
    )
    const binsPerBar = Math.max(1, Math.floor(maxBin / bars))
    const heights = new Float32Array(bars) // EMA 后的标准化高度 0~1
    const peaks = new Float32Array(bars) // 峰值保持（0~1），每帧慢衰减

    let raf = 0
    let stopped = false

    const draw = () => {
      if (stopped) return
      raf = requestAnimationFrame(draw)

      // 页面隐藏时不抽 CPU
      if (document.visibilityState === 'hidden') return

      analyser.getByteFrequencyData(freqData)

      const cssWidth = canvas.clientWidth
      ctx.clearRect(0, 0, cssWidth, height)

      const drawH = mirror ? Math.floor(height * 0.7) : height
      const totalGap = gap * (bars - 1)
      const barWidth = (cssWidth - totalGap) / bars

      // HUD 栅格：水平虚线 + 垂直刻度，给"示波器感"
      if (grid) {
        ctx.save()
        ctx.strokeStyle = 'rgba(0, 217, 255, 0.08)'
        ctx.lineWidth = 1
        for (let y = 0; y <= drawH; y += drawH / 4) {
          ctx.beginPath()
          ctx.setLineDash([2, 4])
          ctx.moveTo(0, Math.floor(y) + 0.5)
          ctx.lineTo(cssWidth, Math.floor(y) + 0.5)
          ctx.stroke()
        }
        ctx.setLineDash([])
        ctx.restore()
      }

      // 柱体渐变：低段 primary，高段滑向 accent 再到 destructive
      const grad = ctx.createLinearGradient(0, drawH, 0, 0)
      grad.addColorStop(0, C_COLD)
      grad.addColorStop(0.6, C_COLD)
      grad.addColorStop(0.82, C_WARM)
      grad.addColorStop(1, C_HOT)

      // 用 store 实时值决定淡化
      const { muted, status } = audioStore.getState()
      const idle = muted || status !== 'playing'
      ctx.globalAlpha = idle ? 0.25 : 1

      // glow（单次绘制，避免开销）
      ctx.shadowColor = C_COLD
      ctx.shadowBlur = idle ? 0 : 6

      for (let i = 0; i < bars; i++) {
        const start = i * binsPerBar
        const end = Math.min(start + binsPerBar, maxBin)
        let sum = 0
        for (let j = start; j < end; j++) sum += freqData[j] ?? 0
        const avg = end > start ? sum / (end - start) : 0
        const target = avg / 255

        const prev = heights[i] ?? 0
        const next = prev + (target - prev) * smoothing
        heights[i] = next
        const h = Math.max(2, next * drawH)
        const y = drawH - h
        const x = i * (barWidth + gap)

        ctx.fillStyle = grad
        ctx.fillRect(x, y, barWidth, h)

        if (peakHold) {
          // 缓慢下落（每帧衰减 0.4% + 3px），取当前高度和上一帧衰减值的最大
          const prevPeak = peaks[i] ?? 0
          const decayed = Math.max(0, prevPeak * 0.994 - 0.003)
          const np = Math.max(next, decayed)
          peaks[i] = np
          const py = drawH - np * drawH
          if (!idle) {
            ctx.fillStyle = 'rgba(255, 176, 0, 0.9)'
            ctx.fillRect(x, Math.floor(py), barWidth, 2)
          }
        }
      }

      // 静止时底座（轻微亮线）
      ctx.shadowBlur = 0
      ctx.globalAlpha = 1
      ctx.fillStyle = C_BASE
      ctx.fillRect(0, drawH - 1, cssWidth, 1)

      // 镜像反射
      if (mirror) {
        const reflectH = height - drawH
        for (let i = 0; i < bars; i++) {
          const h = Math.max(2, (heights[i] ?? 0) * drawH)
          const x = i * (barWidth + gap)
          // 反射高度折半 + 渐隐
          const rh = Math.min(reflectH, h * 0.5)
          const rgrad = ctx.createLinearGradient(0, drawH, 0, drawH + rh)
          rgrad.addColorStop(0, 'rgba(0, 217, 255, 0.35)')
          rgrad.addColorStop(1, 'rgba(0, 217, 255, 0)')
          ctx.fillStyle = rgrad
          ctx.fillRect(x, drawH, barWidth, rh)
        }
      }
    }

    draw()

    return () => {
      stopped = true
      cancelAnimationFrame(raf)
      resizeObs.disconnect()
    }
  }, [engine, height, bars, maxFreqHz, smoothing, gap, mirror, peakHold, grid])

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width: '100%', height, display: 'block' }}
      aria-hidden="true"
    />
  )
}
