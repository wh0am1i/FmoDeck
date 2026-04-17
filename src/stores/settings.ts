import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface FmoAddress {
  id: string
  host: string
  name?: string
}

export interface SettingsState {
  fmoAddresses: FmoAddress[]
  activeAddressId: string | null
  currentCallsign: string
  protocol: 'ws' | 'wss'

  addAddress: (addr: FmoAddress) => void
  removeAddress: (id: string) => void
  setActiveAddress: (id: string | null) => void
  setCurrentCallsign: (call: string) => void
  setProtocol: (p: 'ws' | 'wss') => void
}

type PersistedFields = Pick<
  SettingsState,
  'fmoAddresses' | 'activeAddressId' | 'currentCallsign' | 'protocol'
>

const INITIAL: PersistedFields = {
  fmoAddresses: [],
  activeAddressId: null,
  currentCallsign: '',
  protocol: 'ws'
}

export const settingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...INITIAL,

      addAddress: (addr) => set((s) => ({ fmoAddresses: [...s.fmoAddresses, addr] })),

      removeAddress: (id) =>
        set((s) => ({
          fmoAddresses: s.fmoAddresses.filter((a) => a.id !== id),
          activeAddressId: s.activeAddressId === id ? null : s.activeAddressId
        })),

      setActiveAddress: (id) => set({ activeAddressId: id }),

      setCurrentCallsign: (call) => set({ currentCallsign: call.trim().toUpperCase() }),

      setProtocol: (p) => set({ protocol: p })
    }),
    {
      name: 'fmodeck-settings',
      partialize: (s): PersistedFields => ({
        fmoAddresses: s.fmoAddresses,
        activeAddressId: s.activeAddressId,
        currentCallsign: s.currentCallsign,
        protocol: s.protocol
      })
    }
  )
)

export function resetSettingsForTest(): void {
  settingsStore.setState({ ...INITIAL })
}
