import { useEffect, useRef } from 'react'
import { audioStore } from '../store'
import { engineRefStore } from '../engine-store'

interface Props {
  height?: number
  className?: string
}

/**
 * 时域波形示波器：把 `getByteTimeDomainData()` 以线条形式画出来。
 * 带淡出拖尾（semi-transparent clear 覆盖上一帧）营造发光余辉，
 * HUD 栅格 + 冷蓝线条 + 中心亮线。
 */
export function SpectrumWaveform({ height = 120, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engine = engineRefStore((s) => s.engine)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !engine) return
    const analyser = engine.getAnalyser()
    if (!analyser) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      const cssW = canvas.clientWidth
      canvas.width = Math.max(1, Math.floor(cssW * dpr))
      canvas.height = Math.max(1, Math.floor(height * dpr))
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      // 栅格绘入背景 —— 重绘一次即可
      drawGrid(ctx, cssW, height)
    }

    function drawGrid(c: CanvasRenderingContext2D, w: number, h: number) {
      c.fillStyle = 'rgba(4, 10, 18, 1)'
      c.fillRect(0, 0, w, h)
      c.strokeStyle = 'rgba(0, 217, 255, 0.08)'
      c.lineWidth = 1
      // 水平栅格
      for (let i = 1; i < 4; i++) {
        const y = Math.floor((h / 4) * i) + 0.5
        c.beginPath()
        c.moveTo(0, y)
        c.lineTo(w, y)
        c.stroke()
      }
      // 垂直栅格
      for (let i = 1; i < 8; i++) {
        const x = Math.floor((w / 8) * i) + 0.5
        c.beginPath()
        c.moveTo(x, 0)
        c.lineTo(x, h)
        c.stroke()
      }
      // 中轴线
      c.strokeStyle = 'rgba(0, 217, 255, 0.22)'
      c.beginPath()
      c.moveTo(0, h / 2)
      c.lineTo(w, h / 2)
      c.stroke()
    }

    resize()
    const resizeObs = new ResizeObserver(resize)
    resizeObs.observe(canvas)

    const timeData = new Uint8Array(analyser.fftSize)
    let raf = 0
    let stopped = false

    const draw = () => {
      if (stopped) return
      raf = requestAnimationFrame(draw)
      if (document.visibilityState === 'hidden') return

      const cssW = canvas.clientWidth
      const cssH = height

      // 覆盖半透明黑色制造拖尾衰减
      ctx.fillStyle = 'rgba(4, 10, 18, 0.35)'
      ctx.fillRect(0, 0, cssW, cssH)

      // 中轴线在每次拖尾后被覆盖，补一笔维持可见
      ctx.strokeStyle = 'rgba(0, 217, 255, 0.18)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(0, cssH / 2)
      ctx.lineTo(cssW, cssH / 2)
      ctx.stroke()

      const { muted, status } = audioStore.getState()
      const idle = muted || status !== 'playing'

      analyser.getByteTimeDomainData(timeData)

      ctx.lineWidth = 2
      ctx.strokeStyle = idle ? 'rgba(0, 217, 255, 0.25)' : 'rgba(0, 217, 255, 1)'
      ctx.shadowColor = 'rgba(0, 217, 255, 0.9)'
      ctx.shadowBlur = idle ? 0 : 6
      ctx.beginPath()
      const step = timeData.length / cssW
      for (let x = 0; x < cssW; x++) {
        const v = timeData[Math.floor(x * step)] ?? 128
        // 128 = 0 振幅；归一到 -1~1，再映射到画布
        const norm = (v - 128) / 128
        const y = cssH / 2 + norm * (cssH / 2 - 4)
        if (x === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()
      ctx.shadowBlur = 0
    }

    draw()

    return () => {
      stopped = true
      cancelAnimationFrame(raf)
      resizeObs.disconnect()
    }
  }, [engine, height])

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width: '100%', height, display: 'block' }}
      aria-hidden="true"
    />
  )
}
