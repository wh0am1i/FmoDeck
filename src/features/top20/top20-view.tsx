import { useMemo } from 'react'
import { useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import { GridLocation } from '@/components/shared/grid-location'
import { logsStore, selectMergedRows, type DisplayRow } from '@/features/logs/store'
import { connectionStore } from '@/stores/connection'

interface Top20Item {
  callsign: string
  count: number
  lastTime: number
  /** 最近一次通联时记录的 grid（来源于 DisplayRow.grid）。 */
  grid: string
}

function aggregateTop20(logs: DisplayRow[]): Top20Item[] {
  const map = new Map<string, { count: number; lastTime: number; grid: string }>()
  for (const l of logs) {
    const prev = map.get(l.toCallsign)
    if (prev) {
      prev.count++
      if (l.timestamp > prev.lastTime) {
        prev.lastTime = l.timestamp
        // 最新一次出现的 grid 覆盖旧值（更可能是对方现在的位置）
        if (l.grid) prev.grid = l.grid
      } else if (!prev.grid && l.grid) {
        // 旧记录但补了缺失的 grid
        prev.grid = l.grid
      }
    } else {
      map.set(l.toCallsign, { count: 1, lastTime: l.timestamp, grid: l.grid ?? '' })
    }
  }
  return [...map.entries()]
    .map(([callsign, v]) => ({ callsign, ...v }))
    .sort((a, b) => b.count - a.count || b.lastTime - a.lastTime)
    .slice(0, 20)
}

function formatTs(unixSeconds: number): string {
  const d = new Date(unixSeconds * 1000)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function Top20View() {
  const { t } = useTranslation()
  const all = logsStore((s) => s.all)
  const local = logsStore((s) => s.local)
  const syncMode = logsStore((s) => s.syncMode)
  const merged = useMemo(
    () => selectMergedRows({ ...logsStore.getState(), all, local, syncMode }),
    [all, local, syncMode]
  )
  const top20 = useMemo(() => aggregateTop20(merged), [merged])
  const total = merged.length
  const rawTotal = all.length + local.length
  const connectionStatus = connectionStore((s) => s.status)
  const navigate = useNavigate()

  function gotoLogs(callsign: string) {
    logsStore.getState().setFilter(callsign)
    void navigate('/logs')
  }

  // 离线但有本地记录时允许查看
  if (connectionStatus !== 'connected' && local.length === 0) {
    return (
      <section className="hud-frame p-6">
        <h2 className="hud-title text-primary mb-2">{t('top20.title')}</h2>
        <p className="hud-mono text-sm text-muted-foreground">
          {t('common.offlinePrefix')}
          {t('common.offlineHintAddrs')}，{t('common.offlineHintImport')} ]
        </p>
      </section>
    )
  }

  if (rawTotal === 0) {
    return (
      <section className="hud-frame p-6">
        <h2 className="hud-title text-primary mb-2">{t('top20.title')}</h2>
        <p className="hud-mono text-sm text-muted-foreground">{t('top20.emptyData')}</p>
      </section>
    )
  }

  return (
    <section className="hud-frame flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h2 className="hud-title text-primary">{t('top20.title')}</h2>
        <span className="hud-mono text-xs text-muted-foreground">
          {syncMode === 'today' ? t('logs.todayPrefix') : ''}
          {t('top20.aggregatedOf', { count: total })}
          {syncMode === 'today' && total < rawTotal && (
            <span className="text-muted-foreground/70">
              {' · '}
              {t('top20.excludedHistory', { count: rawTotal - total })}
            </span>
          )}
        </span>
      </div>

      {top20.length === 0 ? (
        <div className="hud-mono text-sm text-muted-foreground py-4">{t('common.noMatch')}</div>
      ) : (
        <ol className="flex flex-col gap-1">
          {top20.map((item, i) => (
            <li
              key={item.callsign}
              className="hud-mono flex flex-wrap items-center gap-x-3 gap-y-1 rounded-sm border border-border/60 px-3 py-2 hover:bg-primary/5"
            >
              <button
                type="button"
                onClick={() => gotoLogs(item.callsign)}
                className="flex flex-1 items-center gap-3 text-left outline-none"
                aria-label={t('top20.viewQsoOf', { callsign: item.callsign })}
              >
                {/* 固定列宽保证跨行对齐：rank 2em · callsign 7em · date 自适应 · count 右对齐固定 */}
                <span className="w-8 text-right text-xs text-muted-foreground tabular-nums">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="w-24 truncate text-sm text-primary">{item.callsign}</span>
                <span className="flex-1 whitespace-nowrap text-xs text-muted-foreground tabular-nums">
                  {t('top20.recentPrefix')}
                  {formatTs(item.lastTime)}
                </span>
                <span className="w-16 text-right text-sm text-primary tabular-nums">
                  {t('top20.timesCount', { count: item.count })}
                </span>
              </button>
              {item.grid && (
                <GridLocation
                  grid={item.grid}
                  className="basis-full text-xs sm:basis-auto sm:pl-[11px]"
                />
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
