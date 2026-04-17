import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { MessageService } from '@/lib/message-service/client'
import { connectionStore } from '@/stores/connection'
import { isValidChineseCallsign } from '@/lib/utils/callsign'
import { Send } from 'lucide-react'

interface Props {
  /** 受控模式：外部控制打开状态（省略则走内部状态 + [撰写] 按钮触发）。 */
  open?: boolean
  onOpenChange?: (o: boolean) => void
  /** 预填收件人（比如从"回复"入口调用）。 */
  initialTo?: string
  /** 受控模式下通常不需要默认的触发按钮。 */
  hideTrigger?: boolean
}

export function ComposeDialog({ open, onOpenChange, initialTo, hideTrigger }: Props = {}) {
  const { t } = useTranslation()
  const [internalOpen, setInternalOpen] = useState(false)
  const controlled = open !== undefined
  const actualOpen = controlled ? open : internalOpen
  const setOpen = (o: boolean) => {
    if (controlled) onOpenChange?.(o)
    else setInternalOpen(o)
  }

  const [to, setTo] = useState(initialTo ?? '')
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)

  // 每次外部打开 + 传入新的 initialTo 时同步预填
  useEffect(() => {
    if (actualOpen) {
      setTo(initialTo ?? '')
      setContent('')
    }
  }, [actualOpen, initialTo])

  const toValid = to.trim().length > 0 && isValidChineseCallsign(to)
  const canSend = toValid && content.trim().length > 0 && !sending

  async function submit() {
    if (!canSend) return
    const client = connectionStore.getState().client
    if (!client) {
      toast.error(t('connection.unavailable'))
      return
    }
    setSending(true)
    try {
      await new MessageService(client).send(to.trim().toUpperCase(), content.trim())
      toast.success(t('compose.sent'))
      setOpen(false)
    } catch (err) {
      toast.error(
        `${t('compose.sendFailedPrefix')}${err instanceof Error ? err.message : String(err)}`
      )
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={actualOpen} onOpenChange={setOpen}>
      {!hideTrigger && (
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Send className="h-4 w-4" />
            {t('compose.button')}
          </Button>
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="hud-title text-primary">{t('compose.title')}</DialogTitle>
          <DialogDescription className="hud-mono text-xs">
            {t('compose.description')}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-2">
          <label className="hud-mono text-xs text-muted-foreground" htmlFor="compose-to">
            {t('compose.toLabel')}
          </label>
          <Input
            id="compose-to"
            value={to}
            onChange={(e) => setTo(e.target.value.toUpperCase())}
            placeholder="BA0AX"
            autoFocus
            aria-invalid={to.length > 0 && !toValid}
          />
          <label className="hud-mono text-xs text-muted-foreground mt-2" htmlFor="compose-content">
            {t('compose.contentLabel')}
          </label>
          <textarea
            id="compose-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={t('compose.contentPlaceholder')}
            rows={5}
            className="hud-mono w-full resize-none rounded-sm border border-border bg-input/50 px-3 py-2 text-sm outline-none focus-visible:border-ring"
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            {t('common.cancel')}
          </Button>
          <Button onClick={() => void submit()} disabled={!canSend}>
            {sending ? t('compose.sending') : t('compose.send')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
