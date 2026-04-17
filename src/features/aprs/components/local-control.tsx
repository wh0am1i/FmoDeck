import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { DeviceControlService } from '@/lib/device-control/client'
import { connectionStore } from '@/stores/connection'
import { Pause, Play, RotateCw } from 'lucide-react'

type LocalAction = 'normal' | 'standby' | 'restart'

const ACTIONS: {
  key: LocalAction
  label: string
  icon: typeof Play
  variant: 'default' | 'secondary' | 'destructive'
  confirm?: string
}[] = [
  { key: 'normal', label: '普通模式', icon: Play, variant: 'default' },
  { key: 'standby', label: '待机模式', icon: Pause, variant: 'secondary' },
  {
    key: 'restart',
    label: '重启 APRS 服务',
    icon: RotateCw,
    variant: 'destructive',
    confirm: '确认要重启设备的 APRS 服务吗？'
  }
]

export function LocalControl() {
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
        toast.success('已切到普通模式')
      } else if (action === 'standby') {
        await svc.setScreenMode(1)
        toast.success('已切到待机模式')
      } else {
        await svc.restartAprsService()
        toast.success('APRS 服务已重启')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="hud-frame flex flex-col gap-4 p-6">
      <h2 className="hud-title text-primary">[ LOCAL CONTROL ]</h2>
      <div className="flex flex-wrap gap-3">
        {ACTIONS.map(({ key, label, icon: Icon, variant, confirm }) => (
          <Button
            key={key}
            variant={variant}
            disabled={disabled}
            onClick={() => void handle(key, confirm)}
            className="min-w-32"
          >
            <Icon className="h-4 w-4" />
            {label}
          </Button>
        ))}
      </div>
      {!connected && (
        <p className="hud-mono text-xs text-muted-foreground">
          [ OFFLINE · 请先在 Settings 配置并激活 FMO 地址 ]
        </p>
      )}
    </section>
  )
}
