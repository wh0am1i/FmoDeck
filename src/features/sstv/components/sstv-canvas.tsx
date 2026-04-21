// src/features/sstv/components/sstv-canvas.tsx
import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { sstvStore } from '../store'
import { modeRegistry } from '@/lib/sstv/modes/registry'
import { SpectrumWaveform } from '@/features/audio/components/spectrum-waveform'

/** 相对时间:< 60s → "N 秒前", < 3600s → "N 分钟前", 否则 → "N 小时前" */
function relativeTime(ts: number): string {
  const diffMs = Date.now() - ts
  const secs = Math.floor(diffMs / 1000)
  if (secs < 60) return `${secs} 秒前`
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins} 分钟前`
  const hours = Math.floor(mins / 60)
  return `${hours} 小时前`
}

export function SstvCanvas({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const status = sstvStore((s) => s.status)
  const activeMode = sstvStore((s) => s.activeMode)
  const progress = sstvStore((s) => s.progress)
  const currentRgba = sstvStore((s) => s.currentRgba)
  const currentWidth = sstvStore((s) => s.currentWidth)
  const currentHeight = sstvStore((s) => s.currentHeight)
  const lastRow = sstvStore((s) => s.lastRow)
  const lastDoneAt = sstvStore((s) => s.lastDoneAt)
  const lastError = sstvStore((s) => s.lastError)

  // 相对时间文字,每秒更新
  const [relTime, setRelTime] = useState<string>('')
  useEffect(() => {
    if (status !== 'done' || lastDoneAt === null) {
      setRelTime('')
      return
    }
    setRelTime(relativeTime(lastDoneAt))
    const id = setInterval(() => setRelTime(relativeTime(lastDoneAt)), 1000)
    return () => clearInterval(id)
  }, [status, lastDoneAt])

  // 找 displayName
  const activeDisplay = activeMode
    ? ([...modeRegistry.values()].find((m) => m.name === activeMode)?.displayName ?? activeMode.toUpperCase())
    : null

  // Canvas 绘制:有图 → 画 rgba;无图 → 画 HUD 栅格
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    if (currentRgba && currentWidth > 0 && currentHeight > 0) {
      if (canvas.width !== currentWidth || canvas.height !== currentHeight) {
        canvas.width = currentWidth
        canvas.height = currentHeight
      }
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      const imgData = new ImageData(
        new Uint8ClampedArray(currentRgba.buffer, currentRgba.byteOffset, currentRgba.byteLength),
        currentWidth,
        currentHeight
      )
      ctx.putImageData(imgData, 0, 0)
    } else {
      // 空态:画 HUD 栅格
      if (canvas.width !== 320 || canvas.height !== 240) {
        canvas.width = 320
        canvas.height = 240
      }
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.fillStyle = 'rgba(4, 10, 18, 1)'
      ctx.fillRect(0, 0, 320, 240)
      ctx.strokeStyle = 'rgba(0, 217, 255, 0.08)'
      ctx.lineWidth = 1
      for (let i = 1; i < 8; i++) {
        const y = Math.floor((240 / 8) * i) + 0.5
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(320, y)
        ctx.stroke()
      }
      for (let i = 1; i < 16; i++) {
        const x = Math.floor((320 / 16) * i) + 0.5
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, 240)
        ctx.stroke()
      }
    }
  }, [currentRgba, currentWidth, currentHeight, lastRow])

  return (
    <div className={cn('relative flex flex-col items-center gap-3', className)}>
      <canvas
        ref={canvasRef}
        width={320}
        height={240}
        style={{ imageRendering: 'pixelated', width: '100%', maxWidth: 640, height: 'auto' }}
        className="rounded-sm border border-primary/30 bg-black"
      />

      {/* waiting / idle 时显示音频电平表 */}
      {(status === 'waiting' || status === 'idle') && (
        <div className="w-full max-w-[240px]">
          <SpectrumWaveform height={32} />
        </div>
      )}

      <div className="hud-mono text-xs text-muted-foreground">
        {status === 'idle' && '等待音频连接…'}
        {status === 'waiting' && '监听中'}
        {status === 'decoding' && (
          <span>
            {activeDisplay} · {Math.round(progress * 100)}%
          </span>
        )}
        {status === 'done' && (
          <span>
            最近接收:{activeDisplay} · {relTime}
          </span>
        )}
        {status === 'timeout' && '超时,已丢弃'}
      </div>

      {lastError && (
        <div className="hud-mono text-xs text-destructive">存档失败:{lastError}</div>
      )}
    </div>
  )
}
