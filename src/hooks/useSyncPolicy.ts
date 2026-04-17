import { useEffect } from 'react'
import { logsStore } from '@/features/logs/store'
import { selectActiveSyncMode, settingsStore } from '@/stores/settings'

/**
 * 把 settings 里激活地址的 `syncMode` 镜像到 `logsStore.syncMode`。
 *
 * 挂在 App 根部（与 useFmoSync 并列）。settings 或 active address 变化时
 * 自动推送到 logs 视图，Top20/OldFriends 通过 `selectSyncedAll` 透明响应。
 */
export function useSyncPolicy(): void {
  useEffect(() => {
    const apply = () => {
      const mode = selectActiveSyncMode(settingsStore.getState())
      logsStore.getState().setSyncMode(mode)
    }

    apply()

    return settingsStore.subscribe((s, prev) => {
      if (s.activeAddressId !== prev.activeAddressId || s.fmoAddresses !== prev.fmoAddresses) {
        apply()
      }
    })
  }, [])
}
