// src/features/sstv/components/sstv-canvas.tsx
import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { modeRegistry } from '@/lib/sstv/modes/registry'
import { SpectrumWaveform } from '@/features/audio/components/spectrum-waveform'
import { sstvStore } from '../store'
import { tryForceStart } from '../control'
import { SstvSignalMeter } from './sstv-signal-meter'
import type { RecentDecodeEntry } from '../store'

// 调试录音面板:dev 模式才动态加载,prod 构建因 import.meta.env.DEV 被替换为 false,
// 整个 lazy chunk 不会被引用 → recording.ts + 面板代码从 prod bundle 中剥离。
const SstvRecorderPanel = import.meta.env.DEV
  ? lazy(() =>
      import('./sstv-recorder-panel').then((m) => ({ default: m.SstvRecorderPanel }))
    )
  : null

function relativeTime(ms: number, t: TFunction): string {
  const diff = (Date.now() - ms) / 1000
  if (diff < 60) return t('sstv.relTimeSec', { n: Math.max(1, Math.floor(diff)) })
  if (diff < 3600) return t('sstv.relTimeMin', { n: Math.floor(diff / 60) })
  return t('sstv.relTimeHour', { n: Math.floor(diff / 3600) })
}

export function SstvCanvas({ className }: { className?: string }) {
  const { t } = useTranslation()
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
  const partialInfo = sstvStore((s) => s.partialInfo)

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
        Uint8ClampedArray.from(currentRgba),
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
        <div className="relative w-full" style={{ maxWidth: 640 }}>
          <canvas
            ref={canvasRef}
            width={320}
            height={240}
            style={{ width: '100%', height: 'auto' }}
            className="rounded-sm border border-primary/30 bg-black"
          />
          {partialInfo && currentRgba && (
            <div className="hud-mono pointer-events-none absolute right-1.5 top-1.5 rounded-sm border border-accent/60 bg-black/70 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-accent">
              {t('sstv.partialBadge', {
                done: partialInfo.completedScanLines,
                total: partialInfo.totalScanLines
              })}
            </div>
          )}
        </div>
        <div className="hud-mono text-xs text-muted-foreground">
          {status === 'idle' && t('sstv.statusIdle')}
          {status === 'waiting' && t('sstv.statusWaiting')}
          {status === 'decoding' && activeDisplay && (
            <span>
              {t('sstv.statusDecoding', {
                mode: activeDisplay,
                percent: Math.round(progress * 100)
              })}
            </span>
          )}
          {status === 'done' && activeDisplay && lastDoneAt !== null && (
            <span>
              {t('sstv.statusRecent', {
                mode: activeDisplay,
                relTime: relativeTime(lastDoneAt, t)
              })}
            </span>
          )}
          {status === 'timeout' && t('sstv.statusTimeout')}
        </div>
        {(status === 'waiting' || status === 'idle') && (
          <div className="flex w-full max-w-[280px] flex-col gap-2">
            <SpectrumWaveform height={32} />
            <SstvSignalMeter />
            <ManualDecodePanel />
          </div>
        )}
        {SstvRecorderPanel && (
          <Suspense fallback={null}>
            <SstvRecorderPanel decoderActive={status === 'decoding'} />
          </Suspense>
        )}
        {lastError && (
          <div className="hud-mono text-xs text-destructive">
            {t('sstv.archiveFailedPrefix')}
            {lastError}
          </div>
        )}
      </div>

      {/* 最近完成帧堆栈(live 之外) */}
      {stackBelow.map((entry) => (
        <RecentFrameCard key={entry.id} entry={entry} />
      ))}
    </div>
  )
}

function ManualDecodePanel() {
  const { t } = useTranslation()
  const modes = [...modeRegistry.values()]
  const [visCode, setVisCode] = useState<number>(modes[0]?.visCode ?? 0)
  const [seconds, setSeconds] = useState<number>(3)

  const handleClick = () => {
    const ms = Math.max(0, Math.min(3, seconds)) * 1000
    const ok = tryForceStart(visCode, ms)
    if (!ok) {
      toast.error(t('sstv.manual.failed'))
    }
  }

  return (
    <details className="hud-mono border-t border-primary/10 pt-2 text-xs">
      <summary className="cursor-pointer text-muted-foreground hover:text-primary">
        {t('sstv.manual.title')}
      </summary>
      <div className="mt-2 flex flex-col gap-2">
        <select
          value={visCode}
          onChange={(e) => setVisCode(Number(e.target.value))}
          className="hud-mono rounded-sm border border-primary/30 bg-black/40 px-1.5 py-0.5 text-xs text-primary outline-none"
        >
          {modes.map((m) => (
            <option key={m.visCode} value={m.visCode}>
              {m.displayName}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            max={3}
            step={0.5}
            value={seconds}
            onChange={(e) => setSeconds(Number(e.target.value))}
            className="hud-mono w-16 rounded-sm border border-primary/30 bg-black/40 px-1.5 py-0.5 text-xs text-primary outline-none"
          />
          <span className="text-muted-foreground">{t('sstv.manual.secondsAgo')}</span>
        </div>
        <button
          type="button"
          onClick={handleClick}
          className="border border-accent/50 px-2 py-0.5 text-accent hover:bg-accent/10"
        >
          {t('sstv.manual.go')}
        </button>
        <span className="text-[10px] text-muted-foreground">{t('sstv.manual.hint')}</span>
      </div>
    </details>
  )
}

function RecentFrameCard({ entry }: { entry: RecentDecodeEntry }) {
  const { t } = useTranslation()
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
      Uint8ClampedArray.from(entry.rgba),
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
          width: '100%',
          maxWidth: 640,
          height: 'auto'
        }}
        className="rounded-sm border border-primary/20 bg-black"
      />
      <div className="hud-mono text-xs text-muted-foreground">
        {entry.displayName} · {relativeTime(entry.createdAt, t)}
      </div>
    </div>
  )
}
