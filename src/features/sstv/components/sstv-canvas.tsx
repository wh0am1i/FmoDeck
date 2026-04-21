// src/features/sstv/components/sstv-canvas.tsx
import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { sstvStore } from '../store'

export function SstvCanvas({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const status = sstvStore((s) => s.status)
  const activeMode = sstvStore((s) => s.activeMode)
  const progress = sstvStore((s) => s.progress)
  const currentRgba = sstvStore((s) => s.currentRgba)
  const currentWidth = sstvStore((s) => s.currentWidth)
  const currentHeight = sstvStore((s) => s.currentHeight)
  const lastRow = sstvStore((s) => s.lastRow)
  const lastError = sstvStore((s) => s.lastError)

  // 每当 rgba buffer 或 lastRow 变化,增量绘制最新几行
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !currentRgba || currentWidth === 0 || currentHeight === 0) return
    if (canvas.width !== currentWidth || canvas.height !== currentHeight) {
      canvas.width = currentWidth
      canvas.height = currentHeight
    }
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    // 简化:每次都重画整帧(rgba 已是完整 buffer,缺未解行是空字节 / 黑)
    // 效率足够,rAF 级频率下不会卡
    const imgData = new ImageData(
      new Uint8ClampedArray(currentRgba.buffer, currentRgba.byteOffset, currentRgba.byteLength),
      currentWidth,
      currentHeight
    )
    ctx.putImageData(imgData, 0, 0)
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
      <div className="hud-mono text-xs text-muted-foreground">
        {status === 'idle' && '等待音频连接…'}
        {status === 'waiting' && '监听中'}
        {status === 'decoding' && (
          <span>
            {activeMode?.toUpperCase()} · {Math.round(progress * 100)}%
          </span>
        )}
        {status === 'done' && '解码完成,已保存'}
        {status === 'timeout' && '超时,已丢弃'}
      </div>
      {lastError && (
        <div className="hud-mono text-xs text-destructive">存档失败:{lastError}</div>
      )}
    </div>
  )
}
