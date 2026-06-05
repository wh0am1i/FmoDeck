import { useTranslation } from 'react-i18next'
import { logsStore, selectTodaysStats } from '@/features/logs/store'

export function TodayStats() {
  const { t } = useTranslation()
  const all = logsStore((s) => s.all)
  const local = logsStore((s) => s.local)
  const { people, qsos } = selectTodaysStats({ ...logsStore.getState(), all, local })

  return (
    <div className="hud-mono flex items-center gap-3 text-xs">
      <span>
        <span data-testid="today-people" className="text-primary tabular-nums">
          {people}
        </span>{' '}
        <span className="text-muted-foreground">{t('home.statPeople')}</span>
      </span>
      <span className="text-border" aria-hidden="true">
        ·
      </span>
      <span>
        <span data-testid="today-qsos" className="text-primary tabular-nums">
          {qsos}
        </span>{' '}
        <span className="text-muted-foreground">{t('home.statQsos')}</span>
      </span>
    </div>
  )
}
