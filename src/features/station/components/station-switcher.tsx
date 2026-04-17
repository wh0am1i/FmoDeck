import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { StationService } from '@/lib/station-service/client'
import { connectionStore } from '@/stores/connection'
import { cn } from '@/lib/utils'
import { stationStore } from '../store'
import { ChevronLeft, ChevronRight, RefreshCw, Radio } from 'lucide-react'

export function StationSwitcher() {
  const { t } = useTranslation()
  const current = stationStore((s) => s.current)
  const list = stationStore((s) => s.list)
  const status = stationStore((s) => s.status)
  const connectionStatus = connectionStore((s) => s.status)
  const [open, setOpen] = useState(false)

  const client = connectionStore.getState().client
  const svc = client ? new StationService(client) : null

  // 连上后自动拉当前中继
  useEffect(() => {
    if (connectionStatus === 'connected' && client) {
      void stationStore.getState().loadCurrent(new StationService(client))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectionStatus])

  // 首次打开 popover 时拉列表
  useEffect(() => {
    if (open && svc && list.length === 0 && status !== 'loading') {
      void stationStore.getState().loadList(svc)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  if (connectionStatus !== 'connected' || !svc) return null

  const busy = status === 'switching' || status === 'loading'

  async function swap(fn: () => Promise<void>, verb: string) {
    try {
      await fn()
      toast.success(
        t('station.switchedTo', {
          name: stationStore.getState().current?.name ?? t('common.unknown')
        })
      )
    } catch (err) {
      toast.error(
        t('station.actionFailed', {
          verb,
          error: err instanceof Error ? err.message : String(err)
        })
      )
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="hud-mono gap-2 text-xs"
          aria-label={t('station.switch')}
        >
          <Radio className={cn('h-3 w-3', busy && 'animate-pulse')} />
          <span className="max-w-32 truncate text-primary">
            {current?.name ?? t('station.notSelected')}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <div className="hud-mono flex flex-col gap-2">
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon-sm"
              disabled={busy}
              onClick={() =>
                void swap(() => stationStore.getState().prev(svc), t('station.verbPrev'))
              }
              aria-label={t('station.previous')}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              disabled={busy}
              onClick={() =>
                void swap(() => stationStore.getState().next(svc), t('station.verbNext'))
              }
              aria-label={t('station.next')}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <div className="flex-1" />
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={busy}
              onClick={() => void stationStore.getState().loadList(svc)}
              aria-label={t('station.refreshList')}
              title={t('station.refreshList')}
            >
              <RefreshCw className={cn('h-4 w-4', status === 'loading' && 'animate-spin')} />
            </Button>
          </div>

          {list.length === 0 && status !== 'loading' && (
            <div className="py-4 text-center text-xs text-muted-foreground">
              {t('station.emptyList')}
            </div>
          )}

          {list.length > 0 && (
            <ul
              className="flex max-h-64 flex-col gap-0.5 overflow-y-auto"
              aria-label={t('station.listAria')}
            >
              {list.map((s) => {
                const isActive = s.uid === current?.uid
                return (
                  <li key={s.uid}>
                    <button
                      type="button"
                      disabled={busy || isActive}
                      onClick={() =>
                        void swap(
                          () => stationStore.getState().setCurrent(svc, s),
                          t('station.verbSwitch')
                        )
                      }
                      className={cn(
                        'flex w-full items-center gap-2 rounded-sm px-2 py-1 text-left text-xs',
                        isActive
                          ? 'bg-primary/10 text-primary'
                          : 'hover:bg-primary/5 disabled:opacity-50'
                      )}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
                      <span className="flex-1 truncate">{s.name}</span>
                      <span className="text-muted-foreground/70">#{s.uid}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
