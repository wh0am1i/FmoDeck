import { useEffect, useRef } from 'react'
import { audioStore } from '../store'
import { engineRefStore } from '../engine-store'

interface Props {
  height?: number
  maxFreqHz?: number
  /** 每秒推进像素数（会映射到 rAF 逐帧滚动的比例） */
  scrollPxPerSec?: number
  className?: string
}

/**
 * 瀑布图（spectrogram）：x 轴为频率（0 ~ maxFreqHz），y 轴为时间（顶部最新）。
 *
 * 实现：每帧把 canvas 自身向下复制 1px 当作"滚动"，再在顶部画一条新的像素行；
 * 像素颜色映射频谱强度（navy → cyan → amber → magenta → 白热）。
 */
export function SpectrumWaterfall({
  height = 180,
  maxFreqHz = 3500,
  scrollPxPerSec = 45,
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

    let dpr = window.devicePixelRatio || 1
    const resize = () => {
      dpr = window.devicePixelRatio || 1
      const cssW = canvas.clientWidth
      canvas.width = Math.max(1, Math.floor(cssW * dpr))
      canvas.height = Math.max(1, Math.floor(height * dpr))
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.fillStyle = 'rgba(4, 10, 18, 1)'
      ctx.fillRect(0, 0, cssW, height)
    }
    resize()
    const resizeObs = new ResizeObserver(resize)
    resizeObs.observe(canvas)

    const freqData = new Uint8Array(analyser.frequencyBinCount)
    const sampleRate = analyser.context.sampleRate
    const maxBin = Math.max(
      1,
      Math.min(
        analyser.frequencyBinCount,
        Math.ceil((maxFreqHz / (sampleRate / 2)) * analyser.frequencyBinCount)
      )
    )

    let lastRowAt = performance.now()
    let raf = 0
    let stopped = false

    // 颜色表：6 档 lerp
    const RAMP: [number, number, number, number][] = [
      [4, 10, 18, 255], // 背景暗
      [0, 40, 70, 255], // 深蓝
      [0, 217, 255, 255], // 青 (primary)
      [255, 176, 0, 255], // 琥珀 (accent)
      [255, 62, 92, 255], // 品红 (destructive)
      [255, 255, 255, 255] // 白热
    ]
    const STOPS = [0, 0.12, 0.35, 0.68, 0.88, 1]

    function ramp(t: number): [number, number, number, number] {
      for (let i = 0; i < STOPS.length - 1; i++) {
        const a = STOPS[i]!
        const b = STOPS[i + 1]!
        if (t <= b) {
          const k = (t - a) / (b - a || 1)
          const c0 = RAMP[i]!
          const c1 = RAMP[i + 1]!
          return [
            Math.round(c0[0] + (c1[0] - c0[0]) * k),
            Math.round(c0[1] + (c1[1] - c0[1]) * k),
            Math.round(c0[2] + (c1[2] - c0[2]) * k),
            Math.round(c0[3] + (c1[3] - c0[3]) * k)
          ]
        }
      }
      return RAMP[RAMP.length - 1]!
    }

    const draw = () => {
      if (stopped) return
      raf = requestAnimationFrame(draw)
      if (document.visibilityState === 'hidden') return

      const { muted, status } = audioStore.getState()
      const idle = muted || status !== 'playing'

      const now = performance.now()
      const elapsed = (now - lastRowAt) / 1000
      // 根据目标 scrollPxPerSec 决定这一帧推进多少 CSS 像素
      const pxToPush = elapsed * scrollPxPerSec
      if (pxToPush < 1) return
      const pushPx = Math.min(6, Math.floor(pxToPush))
      lastRowAt = now

      const cssW = canvas.clientWidth
      const cssH = height

      // 整体向下滚动 pushPx 像素（drawImage 自复制）
      ctx.drawImage(canvas, 0, 0, cssW * dpr, cssH * dpr, 0, pushPx, cssW, cssH)

      // 顶部 pushPx 像素行铺新数据
      analyser.getByteFrequencyData(freqData)
      const row = ctx.createImageData(Math.floor(cssW * dpr), Math.max(1, pushPx * dpr))
      const rowW = row.width
      const rowH = row.height
      for (let x = 0; x < rowW; x++) {
        const bin = Math.floor((x / rowW) * maxBin)
        const v = (freqData[bin] ?? 0) / 255
        const c = ramp(idle ? v * 0.35 : v)
        for (let y = 0; y < rowH; y++) {
          const off = (y * rowW + x) * 4
          row.data[off] = c[0]
          row.data[off + 1] = c[1]
          row.data[off + 2] = c[2]
          row.data[off + 3] = c[3]
        }
      }
      // putImageData 用 device pixels，要先重置变换
      ctx.save()
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.putImageData(row, 0, 0)
      ctx.restore()
    }

    draw()

    return () => {
      stopped = true
      cancelAnimationFrame(raf)
      resizeObs.disconnect()
    }
  }, [engine, height, maxFreqHz, scrollPxPerSec])

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width: '100%', height, display: 'block' }}
      aria-hidden="true"
    />
  )
}
