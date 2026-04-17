import { useState } from 'react'
import { toast } from 'sonner'
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

export function ComposeDialog() {
  const [open, setOpen] = useState(false)
  const [to, setTo] = useState('')
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)

  const toValid = to.trim().length > 0 && isValidChineseCallsign(to)
  const canSend = toValid && content.trim().length > 0 && !sending

  async function submit() {
    if (!canSend) return
    const client = connectionStore.getState().client
    if (!client) {
      toast.error('连接不可用')
      return
    }
    setSending(true)
    try {
      await new MessageService(client).send(to.trim().toUpperCase(), content.trim())
      toast.success('消息已发送')
      setOpen(false)
      setTo('')
      setContent('')
    } catch (err) {
      toast.error(`发送失败: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Send className="h-4 w-4" />
          撰写
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="hud-title text-primary">[ COMPOSE MESSAGE ]</DialogTitle>
          <DialogDescription className="hud-mono text-xs">
            发送消息到另一个 FMO 呼号
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-2">
          <label className="hud-mono text-xs text-muted-foreground" htmlFor="compose-to">
            收件人呼号
          </label>
          <Input
            id="compose-to"
            value={to}
            onChange={(e) => setTo(e.target.value.toUpperCase())}
            placeholder="BA0AX"
            autoFocus
            aria-invalid={to.length > 0 && !toValid}
          />
          <label
            className="hud-mono text-xs text-muted-foreground mt-2"
            htmlFor="compose-content"
          >
            内容
          </label>
          <textarea
            id="compose-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="写点什么..."
            rows={5}
            className="hud-mono w-full resize-none rounded-sm border border-border bg-input/50 px-3 py-2 text-sm outline-none focus-visible:border-ring"
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            取消
          </Button>
          <Button onClick={() => void submit()} disabled={!canSend}>
            {sending ? '发送中...' : '发送'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
