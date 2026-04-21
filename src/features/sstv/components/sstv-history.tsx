// src/features/sstv/components/sstv-history.tsx
import { useCallback, useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import type { SstvImage } from '@/types/sstv'
import { sstvRepo } from '@/lib/db/sstv-repo'
import { SstvHistoryItem } from './sstv-history-item'
import { sstvStore } from '../store'

export function SstvHistory() {
  const [images, setImages] = useState<SstvImage[]>([])
  const [clearOpen, setClearOpen] = useState(false)
  const [clearing, setClearing] = useState(false)
  const status = sstvStore((s) => s.status)

  const load = useCallback(async () => {
    const list = await sstvRepo.list({ limit: 50 })
    setImages(list)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (status === 'done') void load()
  }, [status, load])

  const handleDelete = async (id: string) => {
    await sstvRepo.delete(id)
    void load()
  }

  const handleClear = async () => {
    setClearing(true)
    try {
      await sstvRepo.clear()
      setImages([])
      setClearOpen(false)
    } finally {
      setClearing(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h3 className="hud-mono text-xs uppercase tracking-widest text-muted-foreground">
          历史记录 ({images.length})
        </h3>
        {images.length > 0 && (
          <Button variant="outline" size="sm" onClick={() => setClearOpen(true)}>
            <Trash2 className="h-4 w-4" />
            清空全部
          </Button>
        )}
      </div>
      {images.length === 0 ? (
        <p className="hud-mono text-xs text-muted-foreground">暂无历史。</p>
      ) : (
        <div className="flex max-h-[600px] flex-col gap-2 overflow-y-auto pr-1">
          {images.map((img) => (
            <SstvHistoryItem key={img.id} image={img} onDelete={handleDelete} />
          ))}
        </div>
      )}
      <ConfirmDialog
        open={clearOpen}
        onOpenChange={setClearOpen}
        title="清空 SSTV 历史"
        description="这会删除所有已保存的 SSTV 解码图像,此操作不可撤销。"
        confirmLabel="确认清空"
        cancelLabel="取消"
        destructive
        loading={clearing}
        loadingLabel="清理中…"
        onConfirm={handleClear}
      />
    </div>
  )
}
