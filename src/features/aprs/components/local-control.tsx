import { useState } from 'react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { DeviceControlService } from '@/lib/device-control/client'
import { connectionStore } from '@/stores/connection'
import { Pause, Play, RotateCw } from 'lucide-react'

type LocalAction = 'normal' | 'standby' | 'restart'

interface ActionDef {
  key: LocalAction
  labelKey: string
  icon: typeof Play
  variant: 'default' | 'secondary' | 'destructive'
  confirmKey?: string
}

const ACTIONS: readonly ActionDef[] = [
  { key: 'normal', labelKey: 'aprs.modeNormal', icon: Play, variant: 'default' },
  { key: 'standby', labelKey: 'aprs.modeStandby', icon: Pause, variant: 'secondary' },
  {
    key: 'restart',
    labelKey: 'aprs.restart',
    icon: RotateCw,
    variant: 'destructive',
    confirmKey: 'aprs.confirmRestart'
  }
]

export function LocalControl() {
  const { t } = useTranslation()
  const client = connectionStore((s) => s.client)
  const connectionStatus = connectionStore((s) => s.status)
  const [busy, setBusy] = useState(false)

  const connected = connectionStatus === 'connected' && client !== null
  const disabled = !connected || busy

  async function handle(action: LocalAction, confirmMsg?: string) {
    if (!client) return
    if (confirmMsg && !window.confirm(confirmMsg)) return
    setBusy(true)
    try {
      const svc = new DeviceControlService(client)
      if (action === 'normal') {
        await svc.setScreenMode(0)
        toast.success(t('aprs.normalDone'))
      } else if (action === 'standby') {
        await svc.setScreenMode(1)
        toast.success(t('aprs.standbyDone'))
      } else {
        await svc.restartAprsService()
        toast.success(t('aprs.restartDone'))
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="hud-frame flex flex-col gap-4 p-6">
      <h2 className="hud-title text-primary">{t('aprs.sectionLocal')}</h2>
      <div className="flex flex-wrap gap-3">
        {ACTIONS.map(({ key, labelKey, icon: Icon, variant, confirmKey }) => (
          <Button
            key={key}
            variant={variant}
            disabled={disabled}
            onClick={() => void handle(key, confirmKey ? t(confirmKey) : undefined)}
            className="min-w-32"
          >
            <Icon className="h-4 w-4" />
            {t(labelKey)}
          </Button>
        ))}
      </div>
      {!connected && (
        <p className="hud-mono text-xs text-muted-foreground">
          {t('common.offlinePrefix')}
          {t('common.offlineHintAddrs')} ]
        </p>
      )}
    </section>
  )
}
