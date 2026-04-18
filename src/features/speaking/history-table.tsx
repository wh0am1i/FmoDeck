import { useMemo } from 'react'
import { useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import { GridLocation } from '@/components/shared/grid-location'
import { logsStore } from '@/features/logs/store'
import { speakingStore } from '@/features/speaking/store'
import { settingsStore } from '@/stores/settings'
import { cn } from '@/lib/utils'

function formatTimeAgo(unixSeconds: number, nowMs: number, agoSuffix: string): string {
  const deltaSec = Math.floor(nowMs / 1000) - unixSeconds
  if (deltaSec < 60) return `${deltaSec}s${agoSuffix}`
  const m = Math.floor(deltaSec / 60)
  if (m < 60) return `${m}m${agoSuffix}`
  const h = Math.floor(m / 60)
  if (h < 48) return `${h}h${agoSuffix}`
  return `${Math.floor(h / 24)}d${agoSuffix}`
}

function formatTime(unixSeconds: number): string {
  const d = new Date(unixSeconds * 1000)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

export function HistoryTable() {
  const { t } = useTranslation()
  const history = speakingStore((s) => s.history)
  const logsAll = logsStore((s) => s.all)
  const logsLocal = logsStore((s) => s.local)
  const myCallsign = settingsStore((s) => s.currentCallsign)
  const navigate = useNavigate()

  const sorted = useMemo(() => [...history].sort((a, b) => b.utcTime - a.utcTime), [history])

  // 历史推送里不带 grid，从日志（服务端 + 本地 ADIF）反查每个呼号的最新 grid
  const callsignToGrid = useMemo(() => {
    const map = new Map<string, { grid: string; ts: number }>()
    for (const r of logsAll) {
      if (!r.grid) continue
      const prev = map.get(r.toCallsign)
      if (!prev || r.timestamp > prev.ts) map.set(r.toCallsign, { grid: r.grid, ts: r.timestamp })
    }
    for (const r of logsLocal) {
      if (!r.grid) continue
      const prev = map.get(r.toCallsign)
      if (!prev || r.timestamp > prev.ts) map.set(r.toCallsign, { grid: r.grid, ts: r.timestamp })
    }
    return map
  }, [logsAll, logsLocal])

  const nowMs = Date.now()
  const agoSuffix = t('speaking.agoSuffix')

  function gotoLogs(callsign: string) {
    logsStore.getState().setFilter(callsign)
    void navigate('/logs')
  }

  if (sorted.length === 0) {
    return <p className="hud-mono py-4 text-sm text-muted-foreground">{t('history.offline')}</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="hud-mono w-full text-sm" aria-label={t('history.listAria')}>
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted-foreground">
            <th className="w-8 px-3 py-2">#</th>
            <th className="px-3 py-2">{t('columns.callsign')}</th>
            <th className="hidden px-3 py-2 sm:table-cell">{t('columns.grid')}</th>
            <th className="hidden px-3 py-2 md:table-cell">{t('columns.time')}</th>
            <th className="px-3 py-2 text-right">{t('columns.ago')}</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((item, i) => {
            const isSelf =
              myCallsign.trim().length > 0 &&
              item.callsign.toUpperCase().startsWith(myCallsign.trim().toUpperCase())
            const grid = callsignToGrid.get(item.callsign)?.grid ?? ''
            return (
              <tr
                key={`${item.callsign}-${item.utcTime}-${i}`}
                onClick={() => gotoLogs(item.callsign)}
                className="cursor-pointer border-b border-border/40 hover:bg-primary/5"
              >
                <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                <td className="px-3 py-2">
                  <span className="flex items-center gap-2">
                    <span className="text-primary">{item.callsign}</span>
                    {isSelf && (
                      <span
                        className={cn(
                          'rounded-sm border border-primary bg-primary/10 px-1 text-[10px] leading-4 text-primary'
                        )}
                      >
                        {t('speaking.selfShort')}
                      </span>
                    )}
                  </span>
                </td>
                <td className="hidden px-3 py-2 text-muted-foreground sm:table-cell">
                  {grid ? <GridLocation grid={grid} /> : <span className="opacity-40">—</span>}
                </td>
                <td className="hidden px-3 py-2 text-muted-foreground md:table-cell">
                  {formatTime(item.utcTime)}
                </td>
                <td className="px-3 py-2 text-right text-muted-foreground">
                  {formatTimeAgo(item.utcTime, nowMs, agoSuffix)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
