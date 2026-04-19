import { useEffect } from 'react'
import { updaterStore } from '@/features/updater/store'
import { APP_VERSION } from '@/lib/utils/app-version'
import { isAndroid } from '@/lib/utils/platform'
import { settingsStore } from '@/stores/settings'

const DAY = 24 * 60 * 60 * 1000

/**
 * 挂载 App.tsx,仅 Android + 有 VITE_UPDATE_BASE_URL 时触发一次启动检查。
 * 24h 去重:lastUpdateCheckAt 已记录且距离 now < 24h 的跳过。
 * autoUpdateCheck = false 时不查。
 */
export function useUpdateCheck(): void {
  useEffect(() => {
    if (!isAndroid()) return
    const baseUrl = import.meta.env.VITE_UPDATE_BASE_URL as string | undefined
    if (!baseUrl) return
    const { autoUpdateCheck, lastUpdateCheckAt, setLastUpdateCheckAt } = settingsStore.getState()
    if (!autoUpdateCheck) return
    if (lastUpdateCheckAt && Date.now() - lastUpdateCheckAt < DAY) return

    void updaterStore
      .getState()
      .check(baseUrl, APP_VERSION)
      .then(() => setLastUpdateCheckAt(Date.now()))
  }, [])
}
