import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import { logsStore } from '@/features/logs/store'
import { speakingStore } from '@/features/speaking/store'
import { settingsStore } from '@/stores/settings'
import { parseCallsignSsid } from '@/lib/utils/callsign'
import { cn } from '@/lib/utils'

function isSameOperator(a: string, b: string): boolean {
  if (!a || !b) return false
  try {
    return parseCallsignSsid(a).call === parseCallsignSsid(b).call
  } catch {
    return false
  }
}

function formatTimeAgo(unixSeconds: number, nowMs: number): string {
  const delta = Math.floor(nowMs / 1000) - unixSeconds
  if (delta < 60) return `${delta}s`
  const m = Math.floor(delta / 60)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 48) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

function formatElapsed(ms: number): string {
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  return `${m}m${s % 60}s`
}

export function RecentCallsigns() {
  const { t } = useTranslation()
  const history = speakingStore((s) => s.history)
  const current = speakingStore((s) => s.current)
  const myCallsign = settingsStore((s) => s.currentCallsign)
  const navigate = useNavigate()

  // 每秒重新渲染，更新 "xxs 前" / 当前讲话时长
  const [nowMs, setNowMs] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const sorted = [...history].sort((a, b) => b.utcTime - a.utcTime).slice(0, 12)

  function gotoLogs(callsign: string) {
    logsStore.getState().setFilter(callsign)
    void navigate('/logs')
  }

  const hasAny = current !== null || sorted.length > 0

  return (
    <div className="flex max-h-24 flex-wrap items-center gap-2 overflow-y-auto p-3 sm:max-h-none">
      {current && (
        <button
          type="button"
          onClick={() => gotoLogs(current.callsign)}
          className={cn(
            'hud-mono flex items-center gap-1.5 rounded-sm border border-primary bg-primary/15 px-2.5 py-1 text-xs text-primary',
            'hover:bg-primary/25'
          )}
          title={t('spectrum.rosterCurrent')}
        >
          <span className="h-2 w-2 animate-pulse rounded-full bg-primary" aria-hidden="true" />
          <span className="font-semibold">{current.callsign}</span>
          {isSameOperator(current.callsign, myCallsign) && (
            <span className="rounded-sm border border-primary/60 px-1 text-[9px] leading-3">
              {t('speaking.selfShort')}
            </span>
          )}
          <span className="text-primary/70">{formatElapsed(nowMs - current.startedAtMs)}</span>
        </button>
      )}

      {sorted.map((item, idx) => {
        const isSelf = isSameOperator(item.callsign, myCallsign)
        const currentMatches = current && isSameOperator(item.callsign, current.callsign)
        // 当前讲话者已经出现在大号 chip 里，避免重复
        if (currentMatches) return null
        return (
          <button
            key={`${item.callsign}-${item.utcTime}-${idx}`}
            type="button"
            onClick={() => gotoLogs(item.callsign)}
            className={cn(
              'hud-mono flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-[11px]',
              'border-border/60 text-muted-foreground hover:border-primary hover:text-primary'
            )}
            title={t('speaking.viewQsoWith')}
          >
            <span className="text-primary">{item.callsign}</span>
            {isSelf && (
              <span className="rounded-sm border border-primary/60 px-1 text-[9px] leading-3 text-primary">
                {t('speaking.selfShort')}
              </span>
            )}
            <span className="text-muted-foreground/70">{formatTimeAgo(item.utcTime, nowMs)}</span>
          </button>
        )
      })}

      {!hasAny && (
        <span className="hud-mono text-xs text-muted-foreground">{t('spectrum.rosterEmpty')}</span>
      )}
    </div>
  )
}
