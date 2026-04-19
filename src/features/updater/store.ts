import { create } from 'zustand'
import { compareVersion } from './version-compare'
import { parseManifest } from './manifest'
import type { LatestManifest } from './types'

export type UpdaterState =
  | 'idle'
  | 'checking'
  | 'available'
  | 'downloading'
  | 'ready'
  | 'installing'
  | 'error'

export interface UpdaterStore {
  state: UpdaterState
  manifest: LatestManifest | null
  progress: number
  downloadedPath: string | null
  error: string | null

  check: (baseUrl: string, currentVersion: string) => Promise<void>
  setProgress: (v: number) => void
  setDownloading: () => void
  setReady: (path: string) => void
  setInstalling: () => void
  setError: (msg: string) => void
  dismiss: () => void
  reset: () => void
}

const INIT = {
  state: 'idle' as UpdaterState,
  manifest: null,
  progress: 0,
  downloadedPath: null,
  error: null
}

export const updaterStore = create<UpdaterStore>((set, get) => ({
  ...INIT,

  check: async (baseUrl, currentVersion) => {
    if (get().state !== 'idle' && get().state !== 'error') return
    set({ state: 'checking', error: null })
    try {
      const url = `${baseUrl.replace(/\/$/, '')}/fmodeck/android/latest.json`
      const resp = await fetch(url, { cache: 'no-store' })
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      const json: unknown = await resp.json()
      const parsed = parseManifest(json)
      if (!parsed.ok) {
        console.warn('[updater] manifest rejected:', parsed.reason)
        set({ state: 'idle' })
        return
      }
      const cmp = compareVersion(currentVersion, parsed.manifest.version)
      if (Number.isNaN(cmp) || cmp >= 0) {
        set({ state: 'idle', manifest: parsed.manifest })
        return
      }
      set({ state: 'available', manifest: parsed.manifest })
    } catch (e) {
      console.warn('[updater] check failed:', e)
      set({ state: 'idle' })
    }
  },

  setProgress: (v) => set({ progress: v }),
  setDownloading: () => set({ state: 'downloading', progress: 0, error: null }),
  setReady: (path) => set({ state: 'ready', downloadedPath: path, progress: 1 }),
  setInstalling: () => set({ state: 'installing' }),
  setError: (msg) => set({ state: 'error', error: msg }),
  dismiss: () => set({ state: 'idle' }),
  reset: () => set({ ...INIT })
}))

export function resetUpdaterStoreForTest(): void {
  updaterStore.setState({ ...INIT })
}
