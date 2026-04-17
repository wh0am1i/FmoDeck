import { useSyncExternalStore } from 'react'
import { connectionStore, type ConnectionStatus } from '@/stores/connection'

interface AutoReconnectSnapshot {
  status: ConnectionStatus
  lastError: Error | null
}

export function useAutoReconnect(): AutoReconnectSnapshot {
  return useSyncExternalStore(
    (cb) => connectionStore.subscribe(cb),
    () => {
      const s = connectionStore.getState()
      return { status: s.status, lastError: s.lastError }
    }
  )
}
