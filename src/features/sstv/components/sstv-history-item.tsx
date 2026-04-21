// src/features/sstv/components/sstv-history-item.tsx
import { useEffect, useState } from 'react'
import { Copy, Download, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { modeRegistry } from '@/lib/sstv/modes/registry'
import type { SstvImage } from '@/types/sstv'

interface Props {
  image: SstvImage
  selected: boolean
  onToggleSelect: () => void
  onDelete: (id: string) => void
}

export function SstvHistoryItem({ image, selected, onToggleSelect, onDelete }: Props) {
  const [thumbUrl, setThumbUrl] = useState<string | null>(null)
  const [fullUrl, setFullUrl] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const url = URL.createObjectURL(image.thumbnailBlob)
    setThumbUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [image.thumbnailBlob])

  useEffect(() => {
    if (!open) {
      setFullUrl(null)
      return
    }
    const url = URL.createObjectURL(image.imageBlob)
    setFullUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [open, image.imageBlob])

  const formatted = new Date(image.createdAt).toLocaleString()

  const displayName =
    ([...modeRegistry.values()].find((m) => m.name === image.mode)?.displayName) ??
    image.mode.toUpperCase()

  async function handleDownload() {
    const url = URL.createObjectURL(image.imageBlob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sstv_${image.mode}_${new Date(image.createdAt).toISOString().replace(/[:.]/g, '-')}.png`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  async function handleCopy() {
    try {
      const clipItem = new ClipboardItem({ 'image/png': image.imageBlob })
      await navigator.clipboard.write([clipItem])
      toast.success('已复制到剪贴板')
    } catch (err) {
      toast.error('复制失败', {
        description: err instanceof Error ? err.message : String(err)
      })
    }
  }

  return (
    <>
      <div
        tabIndex={0}
        role="listitem"
        onKeyDown={(e) => {
          if (e.key === 'Delete' || e.key === 'Backspace') {
            e.preventDefault()
            onDelete(image.id)
          }
        }}
        className={cn(
          'flex flex-col gap-2 rounded-sm border bg-card/40 p-2 transition-colors',
          selected ? 'border-primary/60 bg-primary/5' : 'border-primary/20'
        )}
      >
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggleSelect}
            className="accent-primary"
            aria-label="选中此条"
          />
          {thumbUrl ? (
            <img
              src={thumbUrl}
              alt=""
              className="h-[72px] w-[96px] cursor-pointer border border-primary/20 object-cover"
              style={{ imageRendering: 'pixelated' }}
              onClick={() => setOpen(true)}
            />
          ) : (
            <div className="h-[72px] w-[96px] bg-muted/20" />
          )}
          <div className="flex-1 text-xs">
            <div className="hud-mono text-primary">{displayName}</div>
            <div className="text-muted-foreground">{formatted}</div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleDownload} aria-label="下载">
            <Download className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleCopy} aria-label="复制到剪贴板">
            <Copy className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(image.id)}
            aria-label="删除"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[90vw] p-4 sm:max-w-[800px]">
          <DialogTitle className="sr-only">
            {displayName} · {formatted}
          </DialogTitle>
          <DialogDescription className="sr-only">SSTV 解码图像</DialogDescription>
          {fullUrl && (
            <div className="flex flex-col items-center gap-3">
              <img
                src={fullUrl}
                alt=""
                style={{
                  imageRendering: 'pixelated',
                  maxWidth: '100%',
                  maxHeight: '75vh'
                }}
                className="border border-primary/30"
              />
              <div className="flex flex-wrap items-center justify-center gap-3 hud-mono text-xs text-muted-foreground">
                <span className="text-primary">{displayName}</span>
                <span>{formatted}</span>
                <span>
                  {image.width} × {image.height}
                </span>
                <Button variant="ghost" size="sm" onClick={handleDownload}>
                  <Download className="h-4 w-4" />
                  下载
                </Button>
                <Button variant="ghost" size="sm" onClick={handleCopy}>
                  <Copy className="h-4 w-4" />
                  复制
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
