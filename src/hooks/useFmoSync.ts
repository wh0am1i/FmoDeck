import { useEffect } from 'react'
import { connectionStore } from '@/stores/connection'
import { settingsStore, type FmoAddress } from '@/stores/settings'
import { normalizeHost } from '@/lib/utils/url'

function buildUrl(protocol: 'ws' | 'wss', addr: FmoAddress): string {
  return `${protocol}://${normalizeHost(addr.host)}/ws`
}

export function useFmoSync(): void {
  useEffect(() => {
    const computeAndConnect = () => {
      const { fmoAddresses, activeAddressId, protocol } = settingsStore.getState()
      const addr = fmoAddresses.find((a) => a.id === activeAddressId)
      if (!addr) {
        connectionStore.getState().disconnect()
        return
      }
      const url = buildUrl(protocol, addr)
      void connectionStore.getState().connect(url)
    }

    computeAndConnect()

    const unsub = settingsStore.subscribe((s, prev) => {
      if (
        s.activeAddressId !== prev.activeAddressId ||
        s.protocol !== prev.protocol ||
        s.fmoAddresses !== prev.fmoAddresses
      ) {
        computeAndConnect()
      }
    })

    return () => {
      unsub()
      connectionStore.getState().disconnect()
    }
  }, [])
}
