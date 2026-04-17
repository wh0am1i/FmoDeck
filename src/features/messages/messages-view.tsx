import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { MessageService } from '@/lib/message-service/client'
import { notify } from '@/lib/notifications'
import { connectionStore } from '@/stores/connection'
import { settingsStore } from '@/stores/settings'
import { messagesStore, selectHasMore, selectUnreadCount } from './store'
import { ComposeDialog } from './components/compose-dialog'
import { MessageDetailDialog } from './components/message-detail-dialog'
import { MessagesList } from './components/messages-list'
import { CheckCheck, ChevronDown, RefreshCw } from 'lucide-react'

export function MessagesView() {
  const { t } = useTranslation()
  const status = messagesStore((s) => s.status)
  const count = messagesStore((s) => s.list.length)
  const unread = messagesStore(selectUnreadCount)
  const hasMore = messagesStore(selectHasMore)
  const error = messagesStore((s) => s.error)
  const connectionStatus = connectionStore((s) => s.status)
  const client = connectionStore((s) => s.client)

  const [detailId, setDetailId] = useState<string | null>(null)
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [markingAll, setMarkingAll] = useState(false)
  const [didAutoLoad, setDidAutoLoad] = useState(false)

  const canLoad = connectionStatus === 'connected' && client !== null

  const refresh = async () => {
    if (!client) return
    try {
      await messagesStore.getState().load(new MessageService(client))
    } catch {
      /* store 已记录 error */
    }
  }

  const loadMore = async () => {
    if (!client) return
    try {
      await messagesStore.getState().loadMore(new MessageService(client))
    } catch {
      /* store 已记录 error */
    }
  }

  const markAllRead = async () => {
    if (!client || markingAll) return
    setMarkingAll(true)
    try {
      const n = await messagesStore.getState().markAllRead(new MessageService(client))
      if (n > 0) toast.success(t('messages.markedAllRead', { count: n }))
    } finally {
      setMarkingAll(false)
    }
  }

  // 首次连接后自动拉 + 订阅推送
  useEffect(() => {
    if (!canLoad) return
    if (!didAutoLoad) {
      setDidAutoLoad(true)
      void refresh()
    }
    if (!client) return
    const svc = new MessageService(client)
    const unsub = svc.onSummary((s) => {
      messagesStore.getState().prependSummary(s)
      const title = t('messages.newFrom', { from: s.from })
      toast.info(title)
      if (settingsStore.getState().notificationsEnabled) {
        notify(title, t('messages.notificationBody'))
      }
    })
    return unsub
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canLoad, didAutoLoad])

  if (!canLoad) {
    return (
      <section className="hud-frame p-6">
        <h2 className="hud-title text-primary mb-2">{t('messages.title')}</h2>
        <p className="hud-mono text-sm text-muted-foreground">
          {t('common.offlinePrefix')}
          {t('common.offlineHintAddrs')} ]
        </p>
      </section>
    )
  }

  return (
    <section className="hud-frame flex flex-col gap-4 p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-2">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="hud-title text-primary">{t('messages.title')}</h2>
          <span className="hud-mono text-xs text-muted-foreground">
            {unread > 0
              ? t('messages.countUnread', { unread, total: count })
              : t('messages.countTotal', { count })}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ComposeDialog />
          {unread > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => void markAllRead()}
              disabled={markingAll}
              title={t('messages.markAllReadTitle')}
            >
              <CheckCheck className="h-4 w-4" />
              {t('messages.markAllRead')}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => void refresh()}
            disabled={status === 'loading'}
          >
            <RefreshCw className={status === 'loading' ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
            {t('common.refresh')}
          </Button>
        </div>
      </div>

      {status === 'error' && error && (
        <div className="hud-mono text-sm text-destructive">
          {t('common.loadFailedPrefix')}
          {error.message}
        </div>
      )}

      <MessagesList onRowClick={setDetailId} />

      {hasMore && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="sm"
            disabled={status === 'loadingMore' || status === 'loading'}
            onClick={() => void loadMore()}
          >
            <ChevronDown
              className={status === 'loadingMore' ? 'h-4 w-4 animate-bounce' : 'h-4 w-4'}
            />
            {status === 'loadingMore' ? t('common.loading') : t('common.loadMore')}
          </Button>
        </div>
      )}

      <MessageDetailDialog
        messageId={detailId}
        onClose={() => setDetailId(null)}
        onReply={(from) => {
          setDetailId(null)
          setReplyTo(from)
        }}
      />

      <ComposeDialog
        hideTrigger
        open={replyTo !== null}
        onOpenChange={(o) => {
          if (!o) setReplyTo(null)
        }}
        initialTo={replyTo ?? ''}
      />
    </section>
  )
}
