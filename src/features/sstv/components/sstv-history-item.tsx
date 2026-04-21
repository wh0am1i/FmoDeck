// src/features/sstv/components/sstv-history-item.tsx
import { useEffect, useState } from 'react'
import { Copy, Download, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import type { SstvImage } from '@/types/sstv'
import { modeRegistry } from '@/lib/sstv/modes/registry'

interface Props {
  image: SstvImage
  onDelete: (id: string) => void
}

export function SstvHistoryItem({ image, onDelete }: Props) {
  const [thumbUrl, setThumbUrl] = useState<string | null>(null)
  const [fullUrl, setFullUrl] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    const url = URL.createObjectURL(image.thumbnailBlob)
    setThumbUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [image.thumbnailBlob])

  useEffect(() => {
    if (!expanded) {
      setFullUrl(null)
      return
    }
    const url = URL.createObjectURL(image.imageBlob)
    setFullUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [expanded, image.imageBlob])

  const formatted = new Date(image.createdAt).toLocaleString()

  // 用 registry 查 displayName,缺失时回退到 toUpperCase
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
      const item = new ClipboardItem({ 'image/png': image.imageBlob })
      await navigator.clipboard.write([item])
      toast.success('已复制到剪贴板')
    } catch (err) {
      toast.error('复制失败', {
        description: err instanceof Error ? err.message : String(err)
      })
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-sm border border-primary/20 bg-card/40 p-2">
      <div className="flex items-center gap-3">
        {thumbUrl ? (
          <img
            src={thumbUrl}
            alt=""
            className="h-14 w-20 cursor-pointer border border-primary/20 object-cover"
            style={{ imageRendering: 'pixelated' }}
            onClick={() => setExpanded((v) => !v)}
          />
        ) : (
          <div className="h-14 w-20 bg-muted/20" />
        )}
        <div className="flex-1 text-xs">
          <div className="hud-mono text-primary">{displayName}</div>
          <div className="text-muted-foreground">{formatted}</div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDownload}
          aria-label="下载"
        >
          <Download className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          aria-label="复制到剪贴板"
        >
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
      {expanded && fullUrl && (
        <img
          src={fullUrl}
          alt=""
          style={{ imageRendering: 'pixelated', width: '100%', maxWidth: 640 }}
          className="self-center border border-primary/30"
        />
      )}
    </div>
  )
}
