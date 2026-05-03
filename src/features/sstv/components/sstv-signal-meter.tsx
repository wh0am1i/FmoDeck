// src/features/sstv/components/sstv-signal-meter.tsx
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { engineRefStore } from '@/features/audio/engine-store'
import { goertzel } from '@/lib/sstv/dsp'
import { cn } from '@/lib/utils'

interface SignalLevels {
  /** 1900Hz leader 能量(归一化 0..1) */
  leader: number
  /** 1200Hz sync 能量 */
  sync: number
  /** 1700Hz 图像数据中心能量(代理整段 1500-2300 Hz 活动) */
  image: number
}

const POLL_INTERVAL_MS = 100
const WINDOW_MS = 100 // 每次读 ~100ms 数据计算能量

/**
 * SSTV 等待期信号指示器:三条横向能量条显示
 *   - 1900Hz leader(VIS 前导)
 *   - 1200Hz sync(行同步 / VIS break)
 *   - 1700Hz image(图像数据活动)
 *
 * 用 raw analyser(未经 EQ/Compressor)的字节时域数据,Goertzel 估算。
 * 仅在 props.active=true 时跑轮询,空闲时关掉。
 */
export function SstvSignalMeter({ className }: { className?: string }) {
  const { t } = useTranslation()
  const engine = engineRefStore((s) => s.engine)
  const [levels, setLevels] = useState<SignalLevels>({ leader: 0, sync: 0, image: 0 })

  useEffect(() => {
    if (!engine) return
    const analyser = engine.getRawAnalyser()
    if (!analyser) return
    const sampleRate = analyser.context.sampleRate
    const windowSamples = Math.min(analyser.fftSize, Math.round((WINDOW_MS / 1000) * sampleRate))
    const buf = new Float32Array(analyser.fftSize)
    const slice = new Float32Array(windowSamples)

    let stopped = false
    const id = setInterval(() => {
      if (stopped) return
      analyser.getFloatTimeDomainData(buf)
      // 取尾部最近 windowSamples
      slice.set(buf.subarray(buf.length - windowSamples))

      const eLeader = goertzel(slice, 1900, sampleRate)
      const eSync = goertzel(slice, 1200, sampleRate)
      const eImage = goertzel(slice, 1700, sampleRate)
      const eNoise = goertzel(slice, 500, sampleRate)
      // 归一化:用 noise 作底,clip 到 [0, 1]。能量 / (noise·5) 是个软指标,
      // noise 极小时(纯静音)直接 0。
      const denom = Math.max(eNoise * 5, 1e-6)
      setLevels({
        leader: clamp01(eLeader / denom),
        sync: clamp01(eSync / denom),
        image: clamp01(eImage / denom)
      })
    }, POLL_INTERVAL_MS)

    return () => {
      stopped = true
      clearInterval(id)
    }
  }, [engine])

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <Bar label={t('sstv.signal.leader')} value={levels.leader} tone="leader" />
      <Bar label={t('sstv.signal.sync')} value={levels.sync} tone="sync" />
      <Bar label={t('sstv.signal.image')} value={levels.image} tone="image" />
    </div>
  )
}

function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0
  return Math.max(0, Math.min(1, v))
}

function Bar({
  label,
  value,
  tone
}: {
  label: string
  value: number
  tone: 'leader' | 'sync' | 'image'
}) {
  const color =
    tone === 'leader' ? 'bg-primary' : tone === 'sync' ? 'bg-accent' : 'bg-muted-foreground'
  return (
    <div className="flex items-center gap-2">
      <span className="hud-mono w-[5.5rem] text-[10px] text-muted-foreground">{label}</span>
      <div className="hud-mono relative h-1.5 flex-1 overflow-hidden rounded-sm bg-muted/30">
        <div
          className={cn('absolute inset-y-0 left-0 transition-[width] duration-100', color)}
          style={{ width: `${(value * 100).toFixed(0)}%` }}
        />
      </div>
    </div>
  )
}
