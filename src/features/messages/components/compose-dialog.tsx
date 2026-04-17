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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { MessageService } from '@/lib/message-service/client'
import { connectionStore } from '@/stores/connection'
import { isValidChineseCallsign, parseCallsignSsid } from '@/lib/utils/callsign'
import { Send } from 'lucide-react'

interface Props {
  /** 受控模式：外部控制打开状态（省略则走内部状态 + [撰写] 按钮触发）。 */
  open?: boolean
  onOpenChange?: (o: boolean) => void
  /**
   * 预填收件人（从"回复"入口传入）。可以是纯呼号 `BA0AX`，或带 SSID
   * 的 `BA0AX-5`。Dialog 内部会解析并填到两个独立输入框。
   */
  initialTo?: string
  /** 受控模式下通常不需要默认的触发按钮。 */
  hideTrigger?: boolean
}

/** SSID 可选范围：1-15（对齐 FmoLogs；FMO 服务端按此分配子账号）。 */
const SSID_OPTIONS: readonly number[] = Array.from({ length: 15 }, (_, i) => i + 1)

function splitInitial(to?: string): { call: string; ssid: number } {
  if (!to) return { call: '', ssid: 1 }
  try {
    const { call, ssid } = parseCallsignSsid(to)
    return { call, ssid: ssid > 0 ? ssid : 1 }
  } catch {
    return { call: '', ssid: 1 }
  }
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

  const [call, setCall] = useState(() => splitInitial(initialTo).call)
  const [ssid, setSsid] = useState<number>(() => splitInitial(initialTo).ssid)
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)

  // 每次外部打开（或 initialTo 变化）时同步预填
  useEffect(() => {
    if (actualOpen) {
      const init = splitInitial(initialTo)
      setCall(init.call)
      setSsid(init.ssid)
      setContent('')
    }
  }, [actualOpen, initialTo])

  const callValid = call.trim().length > 0 && isValidChineseCallsign(call)
  const canSend = callValid && content.trim().length > 0 && !sending

  async function submit() {
    if (!canSend) return
    const client = connectionStore.getState().client
    if (!client) {
      toast.error(t('connection.unavailable'))
      return
    }
    setSending(true)
    try {
      await new MessageService(client).send(call.trim().toUpperCase(), ssid, content.trim())
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
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex flex-1 flex-col gap-1">
              <label className="hud-mono text-xs text-muted-foreground" htmlFor="compose-call">
                {t('compose.toLabel')}
              </label>
              <Input
                id="compose-call"
                value={call}
                onChange={(e) => setCall(e.target.value.toUpperCase())}
                placeholder="BA0AX"
                autoFocus
                aria-invalid={call.length > 0 && !callValid}
              />
            </div>
            <div className="flex flex-col gap-1 sm:w-28">
              <label className="hud-mono text-xs text-muted-foreground" htmlFor="compose-ssid">
                {t('compose.ssidLabel')}
              </label>
              <Select value={String(ssid)} onValueChange={(v) => setSsid(Number(v))}>
                <SelectTrigger id="compose-ssid">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SSID_OPTIONS.map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <label className="hud-mono text-xs text-muted-foreground mt-2" htmlFor="compose-content">
            {t('compose.contentLabel')}
          </label>
          <textarea
            id="compose-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={t('compose.contentPlaceholder')}
            rows={5}
            maxLength={500}
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
