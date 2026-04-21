// src/features/sstv/components/sstv-canvas.tsx
import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { modeRegistry } from '@/lib/sstv/modes/registry'
import { SpectrumWaveform } from '@/features/audio/components/spectrum-waveform'
import { sstvStore } from '../store'
import type { RecentDecodeEntry } from '../store'

function relativeTime(ms: number): string {
  const diff = (Date.now() - ms) / 1000
  if (diff < 60) return `${Math.max(1, Math.floor(diff))} 秒前`
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`
  return `${Math.floor(diff / 3600)} 小时前`
}

export function SstvCanvas({ className }: { className?: string }) {
  const status = sstvStore((s) => s.status)
  const activeMode = sstvStore((s) => s.activeMode)
  const progress = sstvStore((s) => s.progress)
  const currentRgba = sstvStore((s) => s.currentRgba)
  const currentWidth = sstvStore((s) => s.currentWidth)
  const currentHeight = sstvStore((s) => s.currentHeight)
  const lastRow = sstvStore((s) => s.lastRow)
  const lastDoneAt = sstvStore((s) => s.lastDoneAt)
  const lastError = sstvStore((s) => s.lastError)
  const recentDecodes = sstvStore((s) => s.recentDecodes)

  const canvasRef = useRef<HTMLCanvasElement>(null)

  // "N 秒前"每秒刷新
  const [, tick] = useState(0)
  useEffect(() => {
    if (status !== 'done') return
    const id = setInterval(() => tick((n) => n + 1), 1000)
    return () => clearInterval(id)
  }, [status])

  // 绘制 live canvas(进行中或 done 时画 currentRgba;否则画 HUD 栅格)
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
      // HUD 栅格空态
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

  const activeDisplay = activeMode
    ? ([...modeRegistry.values()].find((m) => m.name === activeMode)?.displayName ??
      activeMode.toUpperCase())
    : null

  // live 已经在 recentDecodes[0] 里了(done 之后),下方堆栈从 index 1 开始
  const stackBelow = status === 'done' ? recentDecodes.slice(1) : recentDecodes

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {/* Live canvas */}
      <div className="flex flex-col items-center gap-2">
        <canvas
          ref={canvasRef}
          width={320}
          height={240}
          style={{
            imageRendering: 'pixelated',
            width: '100%',
            maxWidth: 640,
            height: 'auto'
          }}
          className="rounded-sm border border-primary/30 bg-black"
        />
        <div className="hud-mono text-xs text-muted-foreground">
          {status === 'idle' && '等待音频连接…'}
          {status === 'waiting' && '监听中'}
          {status === 'decoding' && activeDisplay && (
            <span>
              {activeDisplay} · {Math.round(progress * 100)}%
            </span>
          )}
          {status === 'done' && activeDisplay && lastDoneAt !== null && (
            <span>
              最近接收:{activeDisplay} · {relativeTime(lastDoneAt)}
            </span>
          )}
          {status === 'timeout' && '超时,已丢弃'}
        </div>
        {(status === 'waiting' || status === 'idle') && (
          <div className="w-full max-w-[240px]">
            <SpectrumWaveform height={32} />
          </div>
        )}
        {lastError && (
          <div className="hud-mono text-xs text-destructive">存档失败:{lastError}</div>
        )}
      </div>

      {/* 最近完成帧堆栈(live 之外) */}
      {stackBelow.map((entry) => (
        <RecentFrameCard key={entry.id} entry={entry} />
      ))}
    </div>
  )
}

function RecentFrameCard({ entry }: { entry: RecentDecodeEntry }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [, tick] = useState(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = entry.width
    canvas.height = entry.height
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const imgData = new ImageData(
      new Uint8ClampedArray(entry.rgba.buffer, entry.rgba.byteOffset, entry.rgba.byteLength),
      entry.width,
      entry.height
    )
    ctx.putImageData(imgData, 0, 0)
  }, [entry])

  // 相对时间每秒刷新
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="flex flex-col items-center gap-1 border-t border-primary/10 pt-3">
      <canvas
        ref={canvasRef}
        style={{
          imageRendering: 'pixelated',
          width: '100%',
          maxWidth: 640,
          height: 'auto'
        }}
        className="rounded-sm border border-primary/20 bg-black"
      />
      <div className="hud-mono text-xs text-muted-foreground">
        {entry.displayName} · {relativeTime(entry.createdAt)}
      </div>
    </div>
  )
}
