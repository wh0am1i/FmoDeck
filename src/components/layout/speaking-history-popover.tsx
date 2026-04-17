import { useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { logsStore } from '@/features/logs/store'
import { speakingStore } from '@/features/speaking/store'
import { cn } from '@/lib/utils'
import { History } from 'lucide-react'

function formatTimeAgo(unixSeconds: number, nowMs: number, agoSuffix: string): string {
  const deltaSec = Math.floor(nowMs / 1000) - unixSeconds
  if (deltaSec < 60) return `${deltaSec}s${agoSuffix}`
  const m = Math.floor(deltaSec / 60)
  if (m < 60) return `${m}m${agoSuffix}`
  const h = Math.floor(m / 60)
  if (h < 48) return `${h}h${agoSuffix}`
  return `${Math.floor(h / 24)}d${agoSuffix}`
}

interface Props {
  myCallsign: string
}

export function SpeakingHistoryPopover({ myCallsign }: Props) {
  const { t } = useTranslation()
  const history = speakingStore((s) => s.history)
  const navigate = useNavigate()
  const agoSuffix = t('speaking.agoSuffix')

  function gotoLogs(callsign: string) {
    logsStore.getState().setFilter(callsign)
    void navigate('/logs')
  }

  // 按 utcTime DESC 排序
  const sorted = [...history].sort((a, b) => b.utcTime - a.utcTime)
  const nowMs = Date.now()

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="hud-mono flex items-center gap-1 rounded-sm border border-border/60 px-2 py-0.5 text-xs text-muted-foreground hover:border-primary hover:text-primary"
          aria-label={t('speaking.historyAria')}
          title={t('speaking.historyTitle')}
        >
          <History className="h-3 w-3" />
          {t('speaking.history')}
          {history.length > 0 && (
            <span className="text-muted-foreground/70">({history.length})</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 max-w-[90vw]">
        <div className="hud-mono flex flex-col gap-2">
          <div className="flex items-baseline justify-between">
            <span className="hud-title text-xs text-primary">{t('speaking.historyHeader')}</span>
            <span className="text-xs text-muted-foreground">
              {history.length === 0
                ? t('speaking.historyEmpty')
                : t('speaking.historyCount', { count: history.length })}
            </span>
          </div>

          {history.length === 0 ? (
            <div className="py-4 text-center text-xs text-muted-foreground">
              {t('speaking.historyOffline')}
            </div>
          ) : (
            <ul
              className="flex max-h-72 flex-col gap-0.5 overflow-y-auto"
              aria-label={t('speaking.historyListAria')}
            >
              {sorted.map((item, idx) => {
                const isSelf =
                  myCallsign.trim().length > 0 &&
                  item.callsign.toUpperCase().startsWith(myCallsign.trim().toUpperCase())
                return (
                  <li key={`${item.callsign}-${item.utcTime}-${idx}`}>
                    <button
                      type="button"
                      onClick={() => gotoLogs(item.callsign)}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-sm px-2 py-1 text-left text-xs hover:bg-primary/5'
                      )}
                      title={t('speaking.viewQsoWith')}
                    >
                      <span className="text-primary">{item.callsign}</span>
                      {isSelf && (
                        <span className="rounded-sm border border-primary bg-primary/10 px-1 text-[10px] leading-4 text-primary">
                          {t('speaking.selfShort')}
                        </span>
                      )}
                      <span className="flex-1" />
                      <span className="text-muted-foreground/70">
                        {formatTimeAgo(item.utcTime, nowMs, agoSuffix)}
                      </span>
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
