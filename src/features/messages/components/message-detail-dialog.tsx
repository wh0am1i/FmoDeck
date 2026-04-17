import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { MessageService } from '@/lib/message-service/client'
import { connectionStore } from '@/stores/connection'
import { messagesStore } from '../store'
import type { MessageDetail } from '@/types/message'

function formatTs(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleString()
}

interface Props {
  messageId: string | null
  onClose: () => void
}

export function MessageDetailDialog({ messageId, onClose }: Props) {
  const [detail, setDetail] = useState<MessageDetail | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (messageId === null) {
      setDetail(null)
      return
    }
    const client = connectionStore.getState().client
    if (!client) {
      toast.error('连接不可用')
      onClose()
      return
    }
    const svc = new MessageService(client)
    setLoading(true)
    svc
      .getDetail(messageId)
      .then((d) => {
        setDetail(d)
        setLoading(false)
        // 自动标为已读
        svc.setRead(messageId).catch(() => undefined)
        messagesStore.getState().markRead(messageId)
      })
      .catch((err: unknown) => {
        toast.error(`加载失败: ${err instanceof Error ? err.message : String(err)}`)
        setLoading(false)
        onClose()
      })
  }, [messageId, onClose])

  return (
    <Dialog open={messageId !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="hud-title text-primary">[ MESSAGE ]</DialogTitle>
          <DialogDescription className="hud-mono text-xs">
            {detail ? `来自 ${detail.from} · ${formatTs(detail.timestamp)}` : '加载中...'}
          </DialogDescription>
        </DialogHeader>
        {loading && <div className="hud-mono py-6 text-sm text-muted-foreground">加载中...</div>}
        {detail && (
          <div className="hud-mono whitespace-pre-wrap break-words py-2 text-sm">
            {detail.content}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
