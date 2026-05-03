// src/features/sstv/components/sstv-history.tsx
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { cn } from '@/lib/utils'
import { modeRegistry } from '@/lib/sstv/modes/registry'
import type { SstvImage, SstvMode } from '@/types/sstv'
import { sstvRepo } from '@/lib/db/sstv-repo'
import { SstvHistoryItem } from './sstv-history-item'
import { sstvStore } from '../store'

type Filter = 'all' | SstvMode

const PAGE_SIZE = 20

export function SstvHistory() {
  const { t } = useTranslation()
  // 从 modeRegistry 动态生成筛选项,新加 mode 自动出现在筛选区
  const filterLabels = useMemo<{ key: Filter; label: string }[]>(
    () => [
      { key: 'all', label: t('sstv.filter.all') },
      ...[...modeRegistry.values()].map((m) => ({ key: m.name as Filter, label: m.displayName }))
    ],
    [t]
  )
  const [images, setImages] = useState<SstvImage[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<Filter>('all')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [clearOpen, setClearOpen] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [deleteSelOpen, setDeleteSelOpen] = useState(false)
  const [deletingSel, setDeletingSel] = useState(false)
  const [totalCount, setTotalCount] = useState(0)
  const savedCount = sstvStore((s) => s.savedCount)

  const loadFirst = useCallback(async () => {
    setLoading(true)
    try {
      const list = await sstvRepo.list({ limit: PAGE_SIZE })
      const count = await sstvRepo.count()
      setImages(list)
      setHasMore(list.length === PAGE_SIZE && list.length < count)
      setTotalCount(count)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadMore = useCallback(async () => {
    if (images.length === 0 || loading) return
    setLoading(true)
    try {
      const lastCreated = images[images.length - 1]!.createdAt
      const next = await sstvRepo.list({ limit: PAGE_SIZE, before: lastCreated })
      setImages((prev) => [...prev, ...next])
      setHasMore(next.length === PAGE_SIZE)
    } finally {
      setLoading(false)
    }
  }, [images, loading])

  useEffect(() => {
    void loadFirst()
  }, [loadFirst])

  useEffect(() => {
    void loadFirst()
  }, [savedCount, loadFirst])

  const filtered = filter === 'all' ? images : images.filter((img) => img.mode === filter)

  const handleDelete = async (id: string) => {
    await sstvRepo.delete(id)
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
    void loadFirst()
  }

  const handleClear = async () => {
    setClearing(true)
    try {
      await sstvRepo.clear()
      setImages([])
      setSelectedIds(new Set())
      setTotalCount(0)
      setHasMore(false)
      setClearOpen(false)
    } finally {
      setClearing(false)
    }
  }

  const handleDeleteSelected = async () => {
    setDeletingSel(true)
    try {
      await Promise.all([...selectedIds].map((id) => sstvRepo.delete(id)))
      setSelectedIds(new Set())
      setDeleteSelOpen(false)
      await loadFirst()
    } finally {
      setDeletingSel(false)
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selCount = selectedIds.size

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="hud-mono text-xs uppercase tracking-widest text-muted-foreground">
          {t('sstv.history.title', { count: totalCount })}
        </h3>
        <div className="flex items-center gap-2">
          {selCount > 0 && (
            <Button variant="outline" size="sm" onClick={() => setDeleteSelOpen(true)}>
              <Trash2 className="h-4 w-4" />
              {t('sstv.history.deleteSelected', { count: selCount })}
            </Button>
          )}
          {totalCount > 0 && (
            <Button variant="outline" size="sm" onClick={() => setClearOpen(true)}>
              <Trash2 className="h-4 w-4" />
              {t('sstv.history.clearAll')}
            </Button>
          )}
        </div>
      </div>

      {totalCount > 0 && (
        <div className="flex flex-wrap gap-1">
          {filterLabels.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={cn(
                'hud-mono rounded-sm px-2 py-1 text-[11px] transition-colors',
                filter === f.key
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted-foreground hover:text-primary hover:bg-primary/5'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {totalCount === 0 ? (
        <p className="hud-mono text-xs text-muted-foreground">{t('sstv.history.empty')}</p>
      ) : filtered.length === 0 ? (
        <p className="hud-mono text-xs text-muted-foreground">{t('sstv.history.emptyForFilter')}</p>
      ) : (
        <>
          <div className="flex max-h-[600px] flex-col gap-2 overflow-y-auto pr-1">
            {filtered.map((img) => (
              <SstvHistoryItem
                key={img.id}
                image={img}
                selected={selectedIds.has(img.id)}
                onToggleSelect={() => toggleSelect(img.id)}
                onDelete={(id) => {
                  void handleDelete(id)
                }}
              />
            ))}
          </div>
          {hasMore && filter === 'all' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void loadMore()
              }}
              disabled={loading}
            >
              {loading ? t('sstv.history.loading') : t('sstv.history.loadMore')}
            </Button>
          )}
        </>
      )}

      <ConfirmDialog
        open={clearOpen}
        onOpenChange={setClearOpen}
        title={t('sstv.history.clearTitle')}
        description={t('sstv.history.clearDescription')}
        confirmLabel={t('sstv.history.clearConfirm')}
        cancelLabel={t('sstv.history.cancel')}
        destructive
        loading={clearing}
        loadingLabel={t('sstv.history.clearLoading')}
        onConfirm={() => {
          void handleClear()
        }}
      />

      <ConfirmDialog
        open={deleteSelOpen}
        onOpenChange={setDeleteSelOpen}
        title={t('sstv.history.deleteCountTitle', { count: selCount })}
        description={t('sstv.history.deleteCountDescription')}
        confirmLabel={t('sstv.history.deleteConfirm')}
        cancelLabel={t('sstv.history.cancel')}
        destructive
        loading={deletingSel}
        loadingLabel={t('sstv.history.deleteLoading')}
        onConfirm={() => {
          void handleDeleteSelected()
        }}
      />
    </div>
  )
}
