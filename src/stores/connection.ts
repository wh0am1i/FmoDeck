import { create } from 'zustand'
import { FmoApiClient } from '@/lib/fmo-api/client'

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

export interface ConnectionState {
  status: ConnectionStatus
  currentUrl: string | null
  client: FmoApiClient | null
  lastError: Error | null

  connect: (url: string) => Promise<void>
  disconnect: () => void
}

const INITIAL = {
  status: 'disconnected' as ConnectionStatus,
  currentUrl: null as string | null,
  client: null as FmoApiClient | null,
  lastError: null as Error | null
}

export const connectionStore = create<ConnectionState>()((set, get) => ({
  ...INITIAL,

  connect: async (url: string) => {
    const state = get()
    if (state.currentUrl === url && state.status === 'connected') return

    if (state.client) {
      state.client.disconnect()
    }

    const client = new FmoApiClient(url)
    set({ status: 'connecting', currentUrl: url, client, lastError: null })

    try {
      await client.connect()
      set({ status: 'connected', lastError: null })
    } catch (err) {
      set({
        status: 'error',
        lastError: err instanceof Error ? err : new Error(String(err))
      })
    }
  },

  disconnect: () => {
    get().client?.disconnect()
    set({ ...INITIAL })
  }
}))

export function resetConnectionForTest(): void {
  connectionStore.getState().client?.disconnect()
  connectionStore.setState({ ...INITIAL })
}
