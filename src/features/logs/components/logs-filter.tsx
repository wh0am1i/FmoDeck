import { useTranslation } from 'react-i18next'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { logsStore } from '../store'
import { X } from 'lucide-react'

export function LogsFilter() {
  const { t } = useTranslation()
  const filter = logsStore((s) => s.filter)

  return (
    <div className="flex items-center gap-2">
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
    </div>
  )
}
