import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { logsStore, selectTotalPages } from '../store'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export function LogsPagination() {
  const { t } = useTranslation()
  const page = logsStore((s) => s.page)
  const totalPages = logsStore(selectTotalPages)

  const setPage = logsStore.getState().setPage
  const canPrev = page > 0
  const canNext = page < totalPages - 1

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="icon-sm"
        disabled={!canPrev}
        onClick={() => setPage(page - 1)}
        aria-label={t('pagination.previous')}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="hud-mono text-xs text-muted-foreground min-w-16 text-center">
        {page + 1} / {totalPages}
      </span>
      <Button
        variant="outline"
        size="icon-sm"
        disabled={!canNext}
        onClick={() => setPage(page + 1)}
        aria-label={t('pagination.next')}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}
