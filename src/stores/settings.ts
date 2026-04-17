import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * 日志同步模式：
 * - `all`：拉取服务器全量日志（默认）
 * - `today`：只拉取本地时区"今天"（00:00 起）的日志
 * - `incremental`：只拉比本地已有最新一条更新的记录（首次加载等同 `all`）
 *
 * 服务器按时间倒序分页返回（固定 pageSize=20），三种模式通过
 * `QsoService.getListAll` 的 `stopAt` 回调实现 early-break。
 */
export type SyncMode = 'all' | 'today' | 'incremental'

export interface FmoAddress {
  id: string
  host: string
  name?: string
  syncMode?: SyncMode
}

export interface SettingsState {
  fmoAddresses: FmoAddress[]
  activeAddressId: string | null
  currentCallsign: string
  protocol: 'ws' | 'wss'

  addAddress: (addr: FmoAddress) => void
  updateAddress: (id: string, patch: Partial<Omit<FmoAddress, 'id'>>) => void
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

      updateAddress: (id, patch) =>
        set((s) => ({
          fmoAddresses: s.fmoAddresses.map((a) => (a.id === id ? { ...a, ...patch } : a))
        })),

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

/** 读取指定地址的 syncMode，不存在或未设置时返回 `'all'`。 */
export function selectActiveSyncMode(s: SettingsState): SyncMode {
  const active = s.fmoAddresses.find((a) => a.id === s.activeAddressId)
  return active?.syncMode ?? 'all'
}

export function resetSettingsForTest(): void {
  settingsStore.setState({ ...INITIAL })
}
