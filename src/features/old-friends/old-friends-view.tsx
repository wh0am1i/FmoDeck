import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { GridLocation } from '@/components/shared/grid-location'
import { logsStore, selectMergedRows, type DisplayRow } from '@/features/logs/store'
import { connectionStore } from '@/stores/connection'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'

interface FriendRow {
  callsign: string
  count: number
  firstTime: number
  lastTime: number
  grid: string
}

const PAGE_SIZE = 20

function aggregate(logs: readonly DisplayRow[]): FriendRow[] {
  const map = new Map<string, FriendRow>()
  for (const l of logs) {
    const prev = map.get(l.toCallsign)
    if (prev) {
      prev.count++
      if (l.timestamp < prev.firstTime) prev.firstTime = l.timestamp
      if (l.timestamp > prev.lastTime) {
        prev.lastTime = l.timestamp
        prev.grid = l.grid
      }
    } else {
      map.set(l.toCallsign, {
        callsign: l.toCallsign,
        count: 1,
        firstTime: l.timestamp,
        lastTime: l.timestamp,
        grid: l.grid
      })
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count || b.lastTime - a.lastTime)
}

function formatDate(unixSeconds: number): string {
  const d = new Date(unixSeconds * 1000)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function OldFriendsView() {
  const { t } = useTranslation()
  const all = logsStore((s) => s.all)
  const local = logsStore((s) => s.local)
  const syncMode = logsStore((s) => s.syncMode)
  const connectionStatus = connectionStore((s) => s.status)
  const navigate = useNavigate()
  const [filter, setFilter] = useState('')
  const [page, setPage] = useState(0)

  function gotoLogs(callsign: string) {
    logsStore.getState().setFilter(callsign)
    void navigate('/logs')
  }

  const merged = useMemo(
    () => selectMergedRows({ ...logsStore.getState(), all, local, syncMode }),
    [all, local, syncMode]
  )
  const friends = useMemo(() => aggregate(merged), [merged])
  const filtered = useMemo(() => {
    const q = filter.trim().toUpperCase()
    if (!q) return friends
    return friends.filter((f) => f.callsign.toUpperCase().includes(q))
  }, [friends, filter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages - 1)
  const slice = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE)

  if (connectionStatus !== 'connected' && local.length === 0) {
    return (
      <section className="hud-frame p-6">
        <h2 className="hud-title text-primary mb-2">{t('oldFriends.title')}</h2>
        <p className="hud-mono text-sm text-muted-foreground">
          {t('common.offlinePrefix')}
          {t('common.offlineHintAddrs')}，{t('common.offlineHintImport')} ]
        </p>
      </section>
    )
  }

  if (all.length + local.length === 0) {
    return (
      <section className="hud-frame p-6">
        <h2 className="hud-title text-primary mb-2">{t('oldFriends.title')}</h2>
        <p className="hud-mono text-sm text-muted-foreground">{t('oldFriends.emptyData')}</p>
      </section>
    )
  }

  return (
    <section className="hud-frame flex flex-col gap-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="hud-title text-primary">{t('oldFriends.title')}</h2>
        <span className="hud-mono text-xs text-muted-foreground">
          {syncMode === 'today' && t('logs.todayPrefix')}
          {filtered.length === friends.length
            ? t('oldFriends.countAll', { count: friends.length })
            : t('oldFriends.countFiltered', { filtered: filtered.length, total: friends.length })}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Input
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value)
            setPage(0)
          }}
          placeholder={t('oldFriends.filterPlaceholder')}
          className="max-w-xs"
          aria-label={t('oldFriends.filterAria')}
        />
        {filter && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => {
              setFilter('')
              setPage(0)
            }}
            aria-label={t('oldFriends.clearFilter')}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {slice.length === 0 ? (
        <div className="hud-mono text-sm text-muted-foreground py-4">{t('common.noMatch')}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="hud-mono w-full text-sm" aria-label={t('oldFriends.listAria')}>
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-3 py-2 w-8">#</th>
                <th className="px-3 py-2">{t('columns.callsign')}</th>
                <th className="px-3 py-2 hidden sm:table-cell">{t('columns.grid')}</th>
                <th className="px-3 py-2 hidden md:table-cell">{t('columns.first')}</th>
                <th className="px-3 py-2">{t('columns.last')}</th>
                <th className="px-3 py-2 text-right">{t('columns.count')}</th>
              </tr>
            </thead>
            <tbody>
              {slice.map((f, i) => (
                <tr
                  key={f.callsign}
                  onClick={() => gotoLogs(f.callsign)}
                  className="cursor-pointer border-b border-border/40 hover:bg-primary/5"
                >
                  <td className="px-3 py-2 text-muted-foreground">
                    {currentPage * PAGE_SIZE + i + 1}
                  </td>
                  <td className="px-3 py-2 text-primary">
                    <span>{f.callsign}</span>
                    {f.grid && (
                      <div className="mt-0.5 text-xs text-muted-foreground sm:hidden">
                        <GridLocation grid={f.grid} />
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 hidden sm:table-cell text-muted-foreground">
                    <GridLocation grid={f.grid} />
                  </td>
                  <td className="px-3 py-2 hidden md:table-cell text-muted-foreground">
                    {formatDate(f.firstTime)}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{formatDate(f.lastTime)}</td>
                  <td className="px-3 py-2 text-right">
                    <span className="text-primary">{f.count}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-end gap-2">
        <Button
          variant="outline"
          size="icon-sm"
          disabled={currentPage <= 0}
          onClick={() => setPage(currentPage - 1)}
          aria-label={t('pagination.previous')}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="hud-mono text-xs text-muted-foreground min-w-16 text-center">
          {currentPage + 1} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="icon-sm"
          disabled={currentPage >= totalPages - 1}
          onClick={() => setPage(currentPage + 1)}
          aria-label={t('pagination.next')}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </section>
  )
}
