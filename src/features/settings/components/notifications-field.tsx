import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { settingsStore } from '@/stores/settings'
import {
  currentPermission,
  notificationsSupported,
  requestPermission,
  type SupportedPermission
} from '@/lib/notifications'
import { cn } from '@/lib/utils'
import { Bell, BellOff } from 'lucide-react'

export function NotificationsField() {
  const { t } = useTranslation()
  const enabled = settingsStore((s) => s.notificationsEnabled)
  const [perm, setPerm] = useState<SupportedPermission>(() => currentPermission())

  // tab 切回时重新读权限（用户可能在浏览器设置里改过）
  useEffect(() => {
    const onVis = () => setPerm(currentPermission())
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  const supported = notificationsSupported()
  const canEnable = supported && perm === 'granted'

  async function handleToggle() {
    if (enabled) {
      settingsStore.getState().setNotificationsEnabled(false)
      return
    }
    if (perm === 'default') {
      const result = await requestPermission()
      setPerm(result)
      if (result !== 'granted') {
        toast.error(t('settings.notifyPermDenied'))
        return
      }
    } else if (perm === 'denied') {
      toast.error(t('settings.notifyPermDenied'))
      return
    } else if (perm === 'unsupported') {
      toast.error(t('settings.notifyUnsupported'))
      return
    }
    settingsStore.getState().setNotificationsEnabled(true)
  }

  let statusKey = 'settings.notifyStatusDisabled'
  if (!supported) statusKey = 'settings.notifyUnsupported'
  else if (perm === 'denied') statusKey = 'settings.notifyPermDeniedShort'
  else if (perm === 'default') statusKey = 'settings.notifyPermNotAsked'
  else if (enabled) statusKey = 'settings.notifyStatusEnabled'

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant={enabled && canEnable ? 'default' : 'outline'}
          size="sm"
          onClick={() => void handleToggle()}
          disabled={!supported}
        >
          {enabled && canEnable ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
          {enabled && canEnable ? t('settings.notifyDisable') : t('settings.notifyEnable')}
        </Button>
        <span
          className={cn(
            'hud-mono text-xs',
            enabled && canEnable ? 'text-primary' : 'text-muted-foreground'
          )}
        >
          {t(statusKey)}
        </span>
      </div>
      <span className="hud-mono text-xs text-muted-foreground/70">
        {t('settings.notifyDesc')}
      </span>
    </div>
  )
}
