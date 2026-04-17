import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { aprsStore, type AprsAction } from './store'
import { AprsHistory } from './components/aprs-history'
import { AprsParamsForm } from './components/aprs-params-form'
import { Pause, Play, Power } from 'lucide-react'
import { cn } from '@/lib/utils'

const ACTIONS: Array<{ key: AprsAction; label: string; icon: typeof Play; variant: string }> = [
  { key: 'NORMAL', label: '普通模式', icon: Play, variant: 'default' },
  { key: 'STANDBY', label: '待机模式', icon: Pause, variant: 'secondary' },
  { key: 'REBOOT', label: '软重启', icon: Power, variant: 'destructive' }
]

export function AprsView() {
  const status = aprsStore((s) => s.status)
  const lastMessage = aprsStore((s) => s.lastMessage)
  const sending = status === 'sending'

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
      <section className="hud-frame flex flex-col gap-4 p-6">
        <h2 className="hud-title text-primary">[ APRS PARAMS ]</h2>
        <AprsParamsForm />
      </section>

      <section className="hud-frame flex flex-col gap-4 p-6">
        <h2 className="hud-title text-primary">[ CONTROL ]</h2>
        <div className="flex flex-wrap gap-3">
          {ACTIONS.map(({ key, label, icon: Icon, variant }) => (
            <Button
              key={key}
              variant={variant as 'default' | 'secondary' | 'destructive'}
              disabled={sending}
              onClick={() => void handleSend(key)}
              className="min-w-32"
            >
              <Icon className="h-4 w-4" />
              {label}
            </Button>
          ))}
        </div>
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
