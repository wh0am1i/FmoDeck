import { connectionStore, type ConnectionStatus } from '@/stores/connection'

interface AutoReconnectSnapshot {
  status: ConnectionStatus
  lastError: Error | null
}

export function useAutoReconnect(): AutoReconnectSnapshot {
  const status = connectionStore((s) => s.status)
  const lastError = connectionStore((s) => s.lastError)
  return { status, lastError }
}
