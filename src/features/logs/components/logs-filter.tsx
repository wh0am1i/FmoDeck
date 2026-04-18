import { useTranslation } from 'react-i18next'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { logsStore, type DateFilter } from '../store'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'

const DATE_OPTIONS: { key: DateFilter; labelKey: string }[] = [
  { key: 'all', labelKey: 'logs.dateAll' },
  { key: 'today', labelKey: 'logs.dateToday' },
  { key: '7d', labelKey: 'logs.date7d' },
  { key: '30d', labelKey: 'logs.date30d' }
]

export type LogsViewMode = 'logs' | 'history'

interface Props {
  mode: LogsViewMode
  onModeChange: (mode: LogsViewMode) => void
}

export function LogsFilter({ mode, onModeChange }: Props) {
  const { t } = useTranslation()
  const filter = logsStore((s) => s.filter)
  const dateFilter = logsStore((s) => s.dateFilter)
  const isHistory = mode === 'history'

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        value={filter}
        onChange={(e) => logsStore.getState().setFilter(e.target.value)}
        placeholder={t('logs.filterPlaceholder')}
        className="max-w-xs"
        aria-label={t('logs.filterAria')}
      />
      {filter && (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => logsStore.getState().setFilter('')}
          aria-label={t('oldFriends.clearFilter')}
        >
          <X className="h-4 w-4" />
        </Button>
      )}

      <div
        role="radiogroup"
        aria-label={t('logs.dateFilterAria')}
        className="hud-mono flex items-center gap-0.5 rounded-sm border border-border p-0.5"
      >
        <button
          type="button"
          role="radio"
          aria-checked={isHistory}
          onClick={() => onModeChange('history')}
          className={cn(
            'rounded-sm px-2 py-1 text-xs transition-colors',
            isHistory ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-primary'
          )}
        >
          {t('history.toggle')}
        </button>
        {DATE_OPTIONS.map(({ key, labelKey }) => {
          const active = !isHistory && dateFilter === key
          return (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => {
                onModeChange('logs')
                logsStore.getState().setDateFilter(key)
              }}
              className={cn(
                'rounded-sm px-2 py-1 text-xs transition-colors',
                active ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-primary'
              )}
            >
              {t(labelKey)}
            </button>
          )
        })}
      </div>
    </div>
  )
}
