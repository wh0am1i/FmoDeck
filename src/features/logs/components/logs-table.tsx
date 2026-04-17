import { Fragment, useMemo } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { logsStore, selectPageSlice } from '../store'
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
function formatTimeSmart(unixSeconds: number, nowMs: number): string {
  const today = startOfLocalToday(nowMs)
  const yesterday = startOfYesterday(nowMs)
  const d = new Date(unixSeconds * 1000)

  if (unixSeconds >= today) {
    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  }
  if (unixSeconds >= yesterday) {
    return `昨 ${pad(d.getHours())}:${pad(d.getMinutes())}`
  }
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function formatTimeAgo(unixSeconds: number, nowMs: number): string {
  const deltaSec = Math.floor(nowMs / 1000) - unixSeconds
  if (deltaSec < 60) return `${deltaSec}s 前`
  const m = Math.floor(deltaSec / 60)
  if (m < 60) return `${m}m 前`
  const h = Math.floor(m / 60)
  if (h < 48) return `${h}h 前`
  const days = Math.floor(h / 24)
  if (days < 30) return `${days}d 前`
  return `${Math.floor(days / 30)}mo 前`
}

interface Props {
  onRowClick: (logId: number) => void
}

export function LogsTable({ onRowClick }: Props) {
  const slice = logsStore(useShallow(selectPageSlice))
  // 聚合全量（不是仅当前页）用来算"同一呼号累计次数 + 今日呼号集合"
  const all = logsStore((s) => s.all)

  const countByCall = useMemo(() => {
    const m = new Map<string, number>()
    for (const r of all) m.set(r.toCallsign, (m.get(r.toCallsign) ?? 0) + 1)
    return m
  }, [all])

  const nowMs = Date.now()
  const todayStart = startOfLocalToday(nowMs)

  if (slice.length === 0) {
    return (
      <div className="hud-mono text-sm text-muted-foreground py-4">
        [ NO RECORDS · 等连接或清过滤条件 ]
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="hud-mono w-full text-sm" aria-label="QSO 日志列表">
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
              <Fragment key={r.logId}>
                {showOlderDivider && (
                  <tr aria-hidden="true">
                    <td
                      colSpan={5}
                      className="hud-mono border-t border-dashed border-border px-3 py-1 text-[11px] uppercase tracking-wider text-muted-foreground/70"
                    >
                      — 更早 —
                    </td>
                  </tr>
                )}
                <tr
                  onClick={() => onRowClick(r.logId)}
                  className={cn(
                    'cursor-pointer border-b border-border/40 hover:bg-primary/5',
                    isToday && 'bg-primary/5'
                  )}
                  aria-label={isToday ? '今日通联' : undefined}
                >
                  <td
                    className={cn(
                      'px-3 py-2 whitespace-nowrap',
                      isToday ? 'text-primary' : 'text-muted-foreground'
                    )}
                  >
                    {formatTimeSmart(r.timestamp, nowMs)}
                  </td>
                  <td className="hidden md:table-cell px-3 py-2 whitespace-nowrap text-xs text-muted-foreground">
                    {formatTimeAgo(r.timestamp, nowMs)}
                  </td>
                  <td className="px-3 py-2 text-primary">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span>{r.toCallsign}</span>
                      {isToday && (
                        <span className="rounded-sm border border-primary bg-primary/10 px-1 py-0 text-[10px] font-bold uppercase leading-4 text-primary">
                          TODAY
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
