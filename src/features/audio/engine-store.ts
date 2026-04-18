import { create } from 'zustand'
import type { AudioEngine } from '@/lib/audio/engine'

/**
 * 共享 AudioEngine 实例的引用 —— useFmoAudio 在创建 / 销毁时更新，
 * UI 组件（频谱可视化等）订阅这里拿到 engine → getAnalyser()。
 *
 * 不持久化、不 partialize，AnalyserNode 本身也不可序列化。
 */
interface EngineRefState {
  engine: AudioEngine | null
  setEngine: (e: AudioEngine | null) => void
}

export const engineRefStore = create<EngineRefState>((set) => ({
  engine: null,
  setEngine: (e) => set({ engine: e })
}))
