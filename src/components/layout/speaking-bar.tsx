import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { logsStore } from '@/features/logs/store'
import { speakingStore } from '@/features/speaking/store'
import { parseCallsignSsid } from '@/lib/utils/callsign'
import { settingsStore } from '@/stores/settings'
import { cn } from '@/lib/utils'
import { SpeakingHistoryPopover } from './speaking-history-popover'

/** 比较两个呼号（含可选 SSID）的基号是否相同。任一解析失败返回 false。 */
function isSameOperator(a: string, b: string): boolean {
  if (!a || !b) return false
  try {
    return parseCallsignSsid(a).call === parseCallsignSsid(b).call
  } catch {
    return false
  }
}

function formatElapsed(ms: number): string {
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m${s % 60}s`
  return `${Math.floor(m / 60)}h${m % 60}m`
}

function formatTimeAgo(unixSeconds: number, nowMs: number, agoSuffix: string): string {
  const deltaSec = Math.floor(nowMs / 1000) - unixSeconds
  if (deltaSec < 60) return `${deltaSec}s${agoSuffix}`
  const m = Math.floor(deltaSec / 60)
  if (m < 60) return `${m}m${agoSuffix}`
  const h = Math.floor(m / 60)
  if (h < 48) return `${h}h${agoSuffix}`
  return `${Math.floor(h / 24)}d${agoSuffix}`
}

export function SpeakingBar() {
  const { t } = useTranslation()
  const current = speakingStore((s) => s.current)
  const logs = logsStore((s) => s.all)
  const local = logsStore((s) => s.local)
  const myCallsign = settingsStore((s) => s.currentCallsign)

  const isSelf = current !== null && isSameOperator(current.callsign, myCallsign)

  // 每秒重新渲染以更新 "讲话了多少秒"
  const [nowMs, setNowMs] = useState(() => Date.now())
  useEffect(() => {
    if (!current) return
    // 新讲话者出现时立即对齐 nowMs，避免 "elapsed 为负" 抖动
    // （nowMs 在 mount 时锁住，若新 startedAtMs 在其之后，旧值会产生负差）
    setNowMs(Date.now())
    const id = setInterval(() => setNowMs(Date.now()), 1000)
    return () => clearInterval(id)
  }, [current])

  // 与我通联统计（合并服务器 + 本地 ADIF 导入）
  const stats = (() => {
    if (!current) return null
    const target = current.callsign
    const serverMatches = logs.filter((l) => l.toCallsign === target)
    const localMatches = local.filter((l) => l.toCallsign === target)
    const count = serverMatches.length + localMatches.length
    if (count === 0) return { count: 0, lastTime: null as number | null }
    let lastTime = 0
    for (const m of serverMatches) if (m.timestamp > lastTime) lastTime = m.timestamp
    for (const m of localMatches) if (m.timestamp > lastTime) lastTime = m.timestamp
    return { count, lastTime }
  })()

  if (!current) {
    return (
      <div
        aria-label={t('speaking.barAria')}
        className="border-b border-border bg-card/30 px-4 py-2"
      >
        <div className="mx-auto flex max-w-7xl items-center gap-3">
          <span className="h-2 w-2 rounded-full bg-muted-foreground" aria-hidden="true" />
          <span className="hud-mono text-xs text-muted-foreground">{t('speaking.quiet')}</span>
          <div className="flex-1" />
          <SpeakingHistoryPopover myCallsign={myCallsign} />
        </div>
      </div>
    )
  }

  // Math.max 防御 nowMs 尚未追上 startedAtMs 的极短窗口
  const elapsed = formatElapsed(Math.max(0, nowMs - current.startedAtMs))

  return (
    <div
      aria-label={t('speaking.barAria')}
      className="border-b border-primary/40 bg-primary/10 px-4 py-2"
    >
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
        {isSelf ? (
          <span
            className={cn(
              'hud-mono rounded-sm border border-primary bg-primary/10 px-1.5 py-0.5 text-xs text-primary'
            )}
          >
            {t('speaking.self')}
          </span>
        ) : (
          <>
            <span className="hud-mono text-xs text-muted-foreground">·</span>
            {stats && stats.count > 0 ? (
              <span className="hud-mono text-xs">
                <span className="text-muted-foreground">{t('speaking.workedPrefix')}</span>
                <span className="text-primary">{stats.count}</span>
                <span className="text-muted-foreground">{t('speaking.workedSuffix')}</span>
                {stats.lastTime !== null && (
                  <>
                    <span className="text-muted-foreground">{t('speaking.lastPrefix')}</span>
                    <span className="text-primary">
                      {formatTimeAgo(stats.lastTime, nowMs, t('speaking.agoSuffix'))}
                    </span>
                  </>
                )}
              </span>
            ) : (
              <span
                className={cn(
                  'hud-mono rounded-sm border px-1.5 py-0.5 text-xs',
                  'border-[oklch(0.76_0.19_142)] bg-[oklch(0.76_0.19_142)]/15 text-[oklch(0.76_0.19_142)]'
                )}
                title={t('speaking.notWorked')}
              >
                ✦ {t('speaking.newBadge')}
              </span>
            )}
          </>
        )}
        <div className="flex-1" />
        <SpeakingHistoryPopover myCallsign={myCallsign} />
      </div>
    </div>
  )
}
