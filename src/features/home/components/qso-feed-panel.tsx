import { useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import { logsStore } from '@/features/logs/store'

const FEED_LIMIT = 12

function formatHm(unixSeconds: number): string {
  const d = new Date(unixSeconds * 1000)
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

/** 右侧 QSO 实时流浮层：最近 12 条服务器日志，新行闪入。点击跳日志页。 */
export function QsoFeedPanel() {
  const { t } = useTranslation()
  const all = logsStore((s) => s.all)
  const navigate = useNavigate()
  const rows = all.slice(0, FEED_LIMIT)

  return (
    <div
      data-testid="qso-feed-panel"
      className="hud-frame hud-overlay flex h-full flex-col overflow-hidden px-3 py-2"
    >
      <div className="hud-mono mb-1 shrink-0 text-[10px] uppercase tracking-widest text-muted-foreground">
        {t('home.panelQsoFeed')}
      </div>
      {rows.length === 0 ? (
        <span className="hud-mono text-xs text-muted-foreground">{t('home.qsoFeedEmpty')}</span>
      ) : (
        <ul className="flex min-h-0 flex-col overflow-hidden">
          {rows.map((r) => (
            <li key={r.logId} className="hud-flash-in">
              <button
                type="button"
                onClick={() => void navigate('/logs')}
                className="hud-mono flex w-full items-baseline gap-2 px-1 py-0.5 text-left text-xs hover:bg-primary/10"
              >
                <span className="shrink-0 text-muted-foreground">{formatHm(r.timestamp)}</span>
                <span className="truncate text-primary">{r.toCallsign}</span>
                {r.grid && (
                  <span className="shrink-0 text-[10px] text-muted-foreground">{r.grid}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
