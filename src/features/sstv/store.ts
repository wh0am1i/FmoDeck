// src/features/sstv/store.ts
import { create } from 'zustand'
import type { SstvMode } from '@/types/sstv'

type SstvStatus = 'idle' | 'waiting' | 'decoding' | 'done' | 'timeout'

export interface SstvState {
  status: SstvStatus
  /** 当前正在解码的模式;仅 status='decoding' 有效。 */
  activeMode: SstvMode | null
  /** 解码进度 0..1;仅 decoding 有效。 */
  progress: number
  /** 最近一次非致命错误(IDB 写失败等),给 UI 提示用。 */
  lastError: string | null

  setStatus: (s: SstvStatus) => void
  setActiveMode: (m: SstvMode | null) => void
  setProgress: (p: number) => void
  setError: (e: string | null) => void
  reset: () => void
}

export const sstvStore = create<SstvState>((set) => ({
  status: 'idle',
  activeMode: null,
  progress: 0,
  lastError: null,
  setStatus: (status) => set({ status }),
  setActiveMode: (activeMode) => set({ activeMode }),
  setProgress: (progress) => set({ progress }),
  setError: (lastError) => set({ lastError }),
  reset: () => set({ status: 'idle', activeMode: null, progress: 0, lastError: null })
}))
