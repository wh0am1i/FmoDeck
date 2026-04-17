import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { MessageService } from '@/lib/message-service/client'
import { connectionStore } from '@/stores/connection'
import { messagesStore } from '../store'
import type { MessageDetail } from '@/types/message'
import { Reply } from 'lucide-react'

function formatTs(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleString()
}

interface Props {
  messageId: string | null
  onClose: () => void
  /** 点击"回复"时触发：关闭详情并让父组件打开撰写对话框并预填收件人。 */
  onReply?: (from: string) => void
}

export function MessageDetailDialog({ messageId, onClose, onReply }: Props) {
  const { t } = useTranslation()
  const [detail, setDetail] = useState<MessageDetail | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (messageId === null) {
      setDetail(null)
      return
    }
    const client = connectionStore.getState().client
    if (!client) {
      toast.error(t('connection.unavailable'))
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
        toast.error(
          `${t('messageDetail.loadFailedPrefix')}${err instanceof Error ? err.message : String(err)}`
        )
        setLoading(false)
        onClose()
      })
  }, [messageId, onClose, t])

  return (
    <Dialog open={messageId !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="hud-title text-primary">{t('messageDetail.title')}</DialogTitle>
          <DialogDescription className="hud-mono text-xs">
            {detail
              ? t('messageDetail.header', { from: detail.from, time: formatTs(detail.timestamp) })
              : t('messageDetail.loading')}
          </DialogDescription>
        </DialogHeader>
        {loading && (
          <div className="hud-mono py-6 text-sm text-muted-foreground">{t('common.loading')}</div>
        )}
        {detail && (
          <div className="hud-mono whitespace-pre-wrap break-words py-2 text-sm">
            {detail.content}
          </div>
        )}
        {detail && onReply && (
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => onReply(detail.from)}>
              <Reply className="h-4 w-4" />
              {t('messageDetail.reply')}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
