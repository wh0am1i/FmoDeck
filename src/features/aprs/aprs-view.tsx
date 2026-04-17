import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { aprsStore, type AprsAction } from './store'
import { AprsHistory } from './components/aprs-history'
import { AprsParamsForm } from './components/aprs-params-form'
import { LocalControl } from './components/local-control'
import { AlertTriangle, Pause, Play, Power } from 'lucide-react'
import { cn } from '@/lib/utils'

const ACTIONS: { key: AprsAction; label: string; icon: typeof Play; variant: string }[] = [
  { key: 'NORMAL', label: '普通模式', icon: Play, variant: 'default' },
  { key: 'STANDBY', label: '待机模式', icon: Pause, variant: 'secondary' },
  { key: 'REBOOT', label: '软重启', icon: Power, variant: 'destructive' }
]

export function AprsView() {
  const status = aprsStore((s) => s.status)
  const lastMessage = aprsStore((s) => s.lastMessage)
  const mycall = aprsStore((s) => s.mycall)
  const passcode = aprsStore((s) => s.passcode)
  const secret = aprsStore((s) => s.secret)
  const sending = status === 'sending'

  // 必填字段检查（和 store.sendCommand 校验一致）
  const missing: string[] = []
  if (!mycall.trim()) missing.push('登录呼号')
  if (!passcode.trim()) missing.push('APRS Passcode')
  if (!secret.trim()) missing.push('设备密钥')
  const ready = missing.length === 0
  const disabled = !ready || sending

  async function handleSend(action: AprsAction) {
    try {
      await aprsStore.getState().sendCommand(action)
      const result = aprsStore.getState()
      if (result.status === 'success') {
        toast.success(result.lastMessage)
      } else if (result.status === 'error') {
        toast.error(result.lastMessage)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <LocalControl />

      <section className="hud-frame flex flex-col gap-4 p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="hud-title text-primary">[ APRS PARAMS ]</h2>
          <span className="hud-mono text-xs text-muted-foreground">
            APRS 远程控制（走 APRS-IS · 可跨网络）
          </span>
        </div>
        <AprsParamsForm />
      </section>

      <section className="hud-frame flex flex-col gap-4 p-6">
        <h2 className="hud-title text-primary">[ APRS REMOTE CONTROL ]</h2>
        <div className="flex flex-wrap gap-3">
          {ACTIONS.map(({ key, label, icon: Icon, variant }) => (
            <Button
              key={key}
              variant={variant as 'default' | 'secondary' | 'destructive'}
              disabled={disabled}
              onClick={() => void handleSend(key)}
              className="min-w-32"
            >
              <Icon className="h-4 w-4" />
              {label}
            </Button>
          ))}
        </div>
        {!ready && (
          <div
            role="status"
            className="hud-mono flex items-start gap-2 rounded-sm border border-accent bg-accent/10 px-3 py-2 text-xs text-accent"
          >
            <AlertTriangle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
            <span>
              需先在上方填写：<span className="font-bold">{missing.join(' · ')}</span>
            </span>
          </div>
        )}
        {lastMessage && (
          <p
            className={cn(
              'hud-mono text-sm',
              status === 'success' && 'text-green-500',
              status === 'error' && 'text-destructive',
              status === 'sending' && 'text-muted-foreground'
            )}
          >
            {lastMessage}
          </p>
        )}
      </section>

      <section className="hud-frame flex flex-col gap-4 p-6">
        <h2 className="hud-title text-primary">[ HISTORY ]</h2>
        <AprsHistory />
      </section>
    </div>
  )
}
