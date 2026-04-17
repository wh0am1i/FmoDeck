import { useEffect, useState } from 'react'
import { logsStore } from '@/features/logs/store'
import { speakingStore } from '@/features/speaking/store'
import { cn } from '@/lib/utils'

function formatElapsed(ms: number): string {
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m${s % 60}s`
  return `${Math.floor(m / 60)}h${m % 60}m`
}

function formatTimeAgo(unixSeconds: number, nowMs: number): string {
  const deltaSec = Math.floor(nowMs / 1000) - unixSeconds
  if (deltaSec < 60) return `${deltaSec}s 前`
  const m = Math.floor(deltaSec / 60)
  if (m < 60) return `${m}m 前`
  const h = Math.floor(m / 60)
  if (h < 48) return `${h}h 前`
  return `${Math.floor(h / 24)}d 前`
}

export function SpeakingBar() {
  const current = speakingStore((s) => s.current)
  const logs = logsStore((s) => s.all)

  // 每秒重新渲染以更新 "讲话了多少秒"
  const [nowMs, setNowMs] = useState(() => Date.now())
  useEffect(() => {
    if (!current) return
    const id = setInterval(() => setNowMs(Date.now()), 1000)
    return () => clearInterval(id)
  }, [current])

  // 与我通联统计（按当前讲话者 toCallsign 过滤）
  const stats = (() => {
    if (!current) return null
    const matches = logs.filter((l) => l.toCallsign === current.callsign)
    if (matches.length === 0) return { count: 0, lastTime: null as number | null }
    const lastTime = Math.max(...matches.map((m) => m.timestamp))
    return { count: matches.length, lastTime }
  })()

  if (!current) {
    return (
      <div aria-label="讲话状态栏" className="border-b border-border bg-card/30 px-4 py-2">
        <div className="mx-auto flex max-w-7xl items-center gap-3">
          <span className="h-2 w-2 rounded-full bg-muted-foreground" aria-hidden="true" />
          <span className="hud-mono text-xs text-muted-foreground">[ QUIET · 暂无人讲话 ]</span>
        </div>
      </div>
    )
  }

  const elapsed = formatElapsed(nowMs - current.startedAtMs)

  return (
    <div aria-label="讲话状态栏" className="border-b border-primary/40 bg-primary/10 px-4 py-2">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-1">
        <span className="h-2 w-2 rounded-full bg-primary animate-pulse" aria-hidden="true" />
        <span className="hud-title text-primary">{current.callsign}</span>
        {current.grid && (
          <span className="hud-mono text-xs text-muted-foreground">{current.grid}</span>
        )}
        {current.isHost && (
          <span
            className={cn(
              'hud-mono rounded-sm border border-accent bg-accent/10 px-1.5 py-0.5 text-xs text-accent'
            )}
          >
            HOST
          </span>
        )}
        <span className="hud-mono text-xs text-accent">{elapsed}</span>
        <span className="hud-mono text-xs text-muted-foreground">·</span>
        {stats && stats.count > 0 ? (
          <span className="hud-mono text-xs">
            <span className="text-muted-foreground">已通联 </span>
            <span className="text-primary">{stats.count}</span>
            <span className="text-muted-foreground"> 次</span>
            {stats.lastTime !== null && (
              <>
                <span className="text-muted-foreground"> · 上次 </span>
                <span className="text-primary">{formatTimeAgo(stats.lastTime, nowMs)}</span>
              </>
            )}
          </span>
        ) : (
          <span className="hud-mono text-xs text-muted-foreground">首次通联</span>
        )}
      </div>
    </div>
  )
}
