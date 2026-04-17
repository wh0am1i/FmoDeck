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
  const { status, lastError } = useAutoReconnect()
  const url = connectionStore((s) => s.currentUrl)
  const activeId = settingsStore((s) => s.activeAddressId)

  let dotClass = 'bg-muted-foreground'
  let label = ''

  if (status === 'connected') {
    dotClass = 'bg-green-500'
    label = `ONLINE · ${extractHost(url)}`
  } else if (status === 'connecting') {
    dotClass = 'bg-accent animate-pulse'
    label = 'CONNECTING...'
  } else if (status === 'error') {
    dotClass = 'bg-destructive'
    const msg = lastError?.message.split(':')[0] ?? 'UNKNOWN'
    label = `ERROR · ${msg}`
  } else {
    label = activeId ? 'OFFLINE' : 'UNCONFIGURED'
  }

  return (
    <div
      className="hud-mono flex items-center gap-2 text-xs text-muted-foreground"
      aria-label="连接状态"
    >
      <span className={cn('h-2 w-2 rounded-full', dotClass)} aria-hidden="true" />
      <span>{label}</span>
    </div>
  )
}
