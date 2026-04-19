import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { aprsStore, type AprsAction } from './store'
import { AprsHistory } from './components/aprs-history'
import { AprsParamsForm } from './components/aprs-params-form'
import { PasscodeCalculator } from './components/passcode-calculator'
import { AlertTriangle, Pause, Play, Power } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ActionDef {
  key: AprsAction
  labelKey: string
  icon: typeof Play
  variant: 'default' | 'secondary' | 'destructive'
}

const ACTIONS: readonly ActionDef[] = [
  { key: 'NORMAL', labelKey: 'aprsRemote.modeNormal', icon: Play, variant: 'default' },
  { key: 'STANDBY', labelKey: 'aprsRemote.modeStandby', icon: Pause, variant: 'secondary' },
  { key: 'REBOOT', labelKey: 'aprsRemote.modeReboot', icon: Power, variant: 'destructive' }
]

export function AprsView() {
  const { t } = useTranslation()
  const status = aprsStore((s) => s.status)
  const lastMessage = aprsStore((s) => s.lastMessage)
  const mycall = aprsStore((s) => s.mycall)
  const passcode = aprsStore((s) => s.passcode)
  const secret = aprsStore((s) => s.secret)
  const sending = status === 'sending'

  const missing: string[] = []
  if (!mycall.trim()) missing.push(t('aprsRemote.missingMycall'))
  if (!passcode.trim()) missing.push(t('aprsRemote.missingPasscode'))
  if (!secret.trim()) missing.push(t('aprsRemote.missingSecret'))
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
      <section className="hud-frame flex flex-col gap-4 p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="hud-title text-primary">{t('aprsRemote.sectionParams')}</h2>
          <span className="hud-mono text-xs text-muted-foreground">
            {t('aprsRemote.sectionParamsDesc')}
          </span>
        </div>
        <AprsParamsForm />
      </section>

      <section className="hud-frame flex flex-col gap-4 p-6">
        <h2 className="hud-title text-primary">{t('aprsRemote.sectionControl')}</h2>
        <div className="flex flex-wrap gap-3">
          {ACTIONS.map(({ key, labelKey, icon: Icon, variant }) => (
            <Button
              key={key}
              variant={variant}
              disabled={disabled}
              onClick={() => void handleSend(key)}
              className="min-w-32"
            >
              <Icon className="h-4 w-4" />
              {t(labelKey)}
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
              {t('aprsRemote.missingHintPrefix')}
              <span className="font-bold">{missing.join(' · ')}</span>
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
        <h2 className="hud-title text-primary">{t('aprsRemote.sectionHistory')}</h2>
        <AprsHistory />
      </section>

      <PasscodeCalculator />
    </div>
  )
}
