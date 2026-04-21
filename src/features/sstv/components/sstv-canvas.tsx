// src/features/sstv/components/sstv-canvas.tsx
import { useRef } from 'react'
import { cn } from '@/lib/utils'
import { sstvStore } from '../store'
import { useSstvDecoder } from '../hooks/useSstvDecoder'

export function SstvCanvas({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useSstvDecoder({ canvasRef })

  const status = sstvStore((s) => s.status)
  const activeMode = sstvStore((s) => s.activeMode)
  const progress = sstvStore((s) => s.progress)

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
        {status === 'idle' && '等待 SSTV 信号…'}
        {status === 'waiting' && '监听中'}
        {status === 'decoding' && (
          <span>
            {activeMode?.toUpperCase()} · {Math.round(progress * 100)}%
          </span>
        )}
        {status === 'done' && '解码完成,已保存'}
        {status === 'timeout' && '超时,已丢弃'}
      </div>
    </div>
  )
}
