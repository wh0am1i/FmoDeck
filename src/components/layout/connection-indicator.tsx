import { useTranslation } from 'react-i18next'
import { connectionStore } from '@/stores/connection'
import { settingsStore } from '@/stores/settings'
import { useAutoReconnect } from '@/hooks/useAutoReconnect'
import { cn } from '@/lib/utils'

function extractHost(url: string | null): string {
  if (!url) return 'unknown'
  try {
    return new URL(url).host
  } catch {
    return url
  }
}

export function ConnectionIndicator() {
  const { t } = useTranslation()
  const { status, lastError } = useAutoReconnect()
  const url = connectionStore((s) => s.currentUrl)
  const activeId = settingsStore((s) => s.activeAddressId)

  let dotClass = 'bg-muted-foreground'
  let label = ''

  if (status === 'connected') {
    dotClass = 'bg-green-500'
    label = `${t('connection.online')} · ${extractHost(url)}`
  } else if (status === 'connecting') {
    dotClass = 'bg-accent animate-pulse'
    label = t('connection.connecting')
  } else if (status === 'error') {
    dotClass = 'bg-destructive'
    const msg = lastError?.message.split(':')[0] ?? t('common.unknown').toUpperCase()
    label = `${t('connection.error')} · ${msg}`
  } else {
    label = activeId ? t('connection.offline') : t('connection.unconfigured')
  }

  return (
    <div
      className="hud-mono flex items-center gap-2 text-xs text-muted-foreground"
      aria-label={t('connection.status')}
    >
      <span className={cn('h-2 w-2 rounded-full', dotClass)} aria-hidden="true" />
      <span>{label}</span>
    </div>
  )
}
