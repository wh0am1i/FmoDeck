import { useState } from 'react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { Trash2 } from 'lucide-react'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { MessageService } from '@/lib/message-service/client'
import { connectionStore } from '@/stores/connection'
import { cn } from '@/lib/utils'
import { messagesStore } from '../store'

function formatTs(unixSeconds: number): string {
  const d = new Date(unixSeconds * 1000)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

interface Props {
  onRowClick: (messageId: string) => void
}

interface PendingDelete {
  messageId: string
  from: string
}

export function MessagesList({ onRowClick }: Props) {
  const { t } = useTranslation()
  const list = messagesStore((s) => s.list)
  const [pending, setPending] = useState<PendingDelete | null>(null)
  const [busy, setBusy] = useState(false)

  async function confirmDelete() {
    if (!pending) return
    const client = connectionStore.getState().client
    if (!client) {
      toast.error(t('connection.unavailable'))
      return
    }
    setBusy(true)
    try {
      await messagesStore.getState().removeOne(new MessageService(client), pending.messageId)
      toast.success(t('messages.deleted'))
      setPending(null)
    } catch (err) {
      toast.error(
        `${t('messages.deleteFailedPrefix')}${err instanceof Error ? err.message : String(err)}`
      )
    } finally {
      setBusy(false)
    }
  }

  if (list.length === 0) {
    return <div className="hud-mono text-sm text-muted-foreground py-4">{t('messages.empty')}</div>
  }

  return (
    <>
      <ul className="flex flex-col gap-1" aria-label={t('messages.listAria')}>
        {list.map((m) => (
          <li
            key={m.messageId}
            className={cn(
              'hud-mono flex items-stretch rounded-sm border border-border text-sm',
              'hover:bg-primary/5',
              !m.isRead && 'border-l-2 border-l-primary'
            )}
          >
            <button
              type="button"
              onClick={() => onRowClick(m.messageId)}
              className="flex flex-1 items-center gap-3 px-3 py-2 text-left outline-none focus-visible:bg-primary/10"
              aria-label={m.from}
            >
              <span className="flex h-2 w-2 flex-none items-center justify-center">
                {!m.isRead && <span className="h-2 w-2 rounded-full bg-primary" />}
              </span>
              <span className={cn('flex-1 text-primary', m.isRead && 'text-muted-foreground')}>
                {m.from}
              </span>
              <span className="text-xs text-muted-foreground">{formatTs(m.timestamp)}</span>
            </button>
            <button
              type="button"
              onClick={() => setPending({ messageId: m.messageId, from: m.from })}
              aria-label={t('messages.deleteOneAria', { from: m.from })}
              title={t('common.delete')}
              className={cn(
                'flex w-10 flex-none items-center justify-center border-l border-border/60',
                'text-muted-foreground hover:bg-destructive/10 hover:text-destructive',
                'focus-visible:bg-destructive/10 focus-visible:text-destructive outline-none'
              )}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>

      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(o) => {
          if (!o) setPending(null)
        }}
        destructive
        loading={busy}
        title={t('messages.confirmDeleteTitle')}
        description={pending ? t('messages.confirmDelete', { from: pending.from }) : undefined}
        confirmLabel={t('common.delete')}
        loadingLabel={t('messages.deletingOne')}
        onConfirm={confirmDelete}
      />
    </>
  )
}
