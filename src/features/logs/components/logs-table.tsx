import { Fragment, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { logsStore, rowKey, selectPageSlice, type DisplayRow } from '../store'
import { cn } from '@/lib/utils'

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function startOfLocalToday(nowMs: number): number {
  const d = new Date(nowMs)
  d.setHours(0, 0, 0, 0)
  return Math.floor(d.getTime() / 1000)
}

function startOfYesterday(nowMs: number): number {
  return startOfLocalToday(nowMs) - 86400
}

/**
 * 时间显示：
 * - 今天：HH:MM:SS（短）
 * - 昨天：昨 HH:MM
 * - 更早：MM-DD HH:MM
 */
function formatTimeSmart(unixSeconds: number, nowMs: number, yesterdayPrefix: string): string {
  const today = startOfLocalToday(nowMs)
  const yesterday = startOfYesterday(nowMs)
  const d = new Date(unixSeconds * 1000)

  if (unixSeconds >= today) {
    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  }
  if (unixSeconds >= yesterday) {
    return `${yesterdayPrefix}${pad(d.getHours())}:${pad(d.getMinutes())}`
  }
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function formatTimeAgo(unixSeconds: number, nowMs: number, agoSuffix: string): string {
  const deltaSec = Math.floor(nowMs / 1000) - unixSeconds
  if (deltaSec < 60) return `${deltaSec}s${agoSuffix}`
  const m = Math.floor(deltaSec / 60)
  if (m < 60) return `${m}m${agoSuffix}`
  const h = Math.floor(m / 60)
  if (h < 48) return `${h}h${agoSuffix}`
  const days = Math.floor(h / 24)
  if (days < 30) return `${days}d${agoSuffix}`
  return `${Math.floor(days / 30)}mo${agoSuffix}`
}

interface Props {
  onRowClick: (row: DisplayRow) => void
}

export function LogsTable({ onRowClick }: Props) {
  const { t } = useTranslation()
  // 订阅原子状态，本地 useMemo 做派生计算（避免 selector 返回数组每次新引用触发无限重渲）
  const all = logsStore((s) => s.all)
  const local = logsStore((s) => s.local)
  const filter = logsStore((s) => s.filter)
  const page = logsStore((s) => s.page)
  const pageSize = logsStore((s) => s.pageSize)
  const syncMode = logsStore((s) => s.syncMode)

  const slice: DisplayRow[] = useMemo(
    () =>
      selectPageSlice({
        ...logsStore.getState(),
        all,
        local,
        filter,
        page,
        pageSize,
        syncMode
      }),
    [all, local, filter, page, pageSize, syncMode]
  )

  const countByCall = useMemo(() => {
    const m = new Map<string, number>()
    for (const r of all) m.set(r.toCallsign, (m.get(r.toCallsign) ?? 0) + 1)
    for (const r of local) m.set(r.toCallsign, (m.get(r.toCallsign) ?? 0) + 1)
    return m
  }, [all, local])

  const nowMs = Date.now()
  const todayStart = startOfLocalToday(nowMs)
  const yesterdayPrefix = t('common.yesterdayPrefix')
  const agoSuffix = t('speaking.agoSuffix')

  if (slice.length === 0) {
    return <div className="hud-mono text-sm text-muted-foreground py-4">{t('logs.emptyTable')}</div>
  }

  return (
    <div className="overflow-x-auto">
      <table className="hud-mono w-full text-sm" aria-label={t('logs.title')}>
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted-foreground">
            <th className="px-3 py-2 min-w-24">TIME</th>
            <th className="hidden md:table-cell px-3 py-2">AGO</th>
            <th className="px-3 py-2">TO CALL</th>
            <th className="hidden sm:table-cell px-3 py-2">GRID</th>
            <th className="px-3 py-2 text-right">QSO</th>
          </tr>
        </thead>
        <tbody>
          {slice.map((r, i) => {
            const count = countByCall.get(r.toCallsign) ?? 1
            const isToday = r.timestamp >= todayStart
            const prev = i > 0 ? slice[i - 1] : null
            const prevWasToday = prev ? prev.timestamp >= todayStart : false
            // 今日 → 更早的第一个过渡行前插入分隔
            const showOlderDivider = prevWasToday && !isToday
            return (
              <Fragment key={rowKey(r)}>
                {showOlderDivider && (
                  <tr aria-hidden="true">
                    <td
                      colSpan={5}
                      className="hud-mono border-t border-dashed border-border px-3 py-1 text-[11px] uppercase tracking-wider text-muted-foreground/70"
                    >
                      {t('common.earlier')}
                    </td>
                  </tr>
                )}
                <tr
                  onClick={() => onRowClick(r)}
                  className={cn(
                    'cursor-pointer border-b border-border/40 hover:bg-primary/5',
                    isToday && 'bg-primary/5'
                  )}
                  aria-label={isToday ? t('common.today') : undefined}
                >
                  <td
                    className={cn(
                      'px-3 py-2 whitespace-nowrap',
                      isToday ? 'text-primary' : 'text-muted-foreground'
                    )}
                  >
                    {formatTimeSmart(r.timestamp, nowMs, yesterdayPrefix)}
                  </td>
                  <td className="hidden md:table-cell px-3 py-2 whitespace-nowrap text-xs text-muted-foreground">
                    {formatTimeAgo(r.timestamp, nowMs, agoSuffix)}
                  </td>
                  <td className="px-3 py-2 text-primary">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span>{r.toCallsign}</span>
                      {isToday && (
                        <span className="rounded-sm border border-primary bg-primary/10 px-1 py-0 text-[10px] font-bold uppercase leading-4 text-primary">
                          TODAY
                        </span>
                      )}
                      {r.source === 'local' && (
                        <span
                          className="rounded-sm border border-accent bg-accent/10 px-1 py-0 text-[10px] font-bold uppercase leading-4 text-accent"
                          title={t('logDetail.localSource')}
                        >
                          LOCAL
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="hidden sm:table-cell px-3 py-2 text-muted-foreground">{r.grid}</td>
                  <td className="px-3 py-2 text-right">
                    {count > 1 ? (
                      <span className="hud-mono text-xs">
                        <span className="text-primary">{count}</span>
                        <span className="text-muted-foreground">×</span>
                      </span>
                    ) : (
                      <span className="hud-mono text-xs text-muted-foreground/60">1×</span>
                    )}
                  </td>
                </tr>
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
