import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AudioEngineStatus } from '@/lib/audio/engine'

export interface AudioState {
  /** 运行状态（非持久）。 */
  status: AudioEngineStatus
  /** 启用收听（持久化）。true 表示用户已解锁并希望收听；断线会自动重连。 */
  enabled: boolean
  /** 音量 0~2（持久化）。 */
  volume: number
  /** 静音（持久化）。muted=true 时暂停 AudioContext，不播声音但 ws 继续保持。 */
  muted: boolean
  /** 最近一次错误信息（非持久，仅用于 UI 提示）。 */
  lastError: string | null

  setStatus: (s: AudioEngineStatus, err?: string | null) => void
  setEnabled: (v: boolean) => void
  setVolume: (v: number) => void
  setMuted: (v: boolean) => void
}

type Persisted = Pick<AudioState, 'enabled' | 'volume' | 'muted'>

export const audioStore = create<AudioState>()(
  persist(
    (set) => ({
      status: 'idle',
      enabled: false,
      volume: 1.0,
      muted: false,
      lastError: null,

      setStatus: (s, err = null) => set({ status: s, lastError: err }),
      setEnabled: (v) => set({ enabled: v }),
      setVolume: (v) => set({ volume: Math.max(0, Math.min(2, v)) }),
      setMuted: (v) => set({ muted: v })
    }),
    {
      name: 'fmodeck-audio',
      partialize: (s): Persisted => ({
        enabled: s.enabled,
        volume: s.volume,
        muted: s.muted
      })
    }
  )
)

export function resetAudioForTest(): void {
  audioStore.setState({
    status: 'idle',
    enabled: false,
    volume: 1.0,
    muted: false,
    lastError: null
  })
}
