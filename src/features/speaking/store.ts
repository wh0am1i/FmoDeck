import { create } from 'zustand'

export interface SpeakingHistoryItem {
  callsign: string
  /** Unix 秒（服务器原值） */
  utcTime: number
}

export interface CurrentSpeaker {
  callsign: string
  grid: string
  isHost: boolean
  /** 本地开始讲话的 Date.now() 毫秒。用于计算"讲话时长"。 */
  startedAtMs: number
}

export interface SpeakingState {
  current: CurrentSpeaker | null
  history: SpeakingHistoryItem[]

  startSpeaking: (data: { callsign: string; grid: string; isHost: boolean }) => void
  stopSpeaking: () => void
  setHistory: (list: SpeakingHistoryItem[]) => void
}

const INITIAL = {
  current: null as CurrentSpeaker | null,
  history: [] as SpeakingHistoryItem[]
}

export const speakingStore = create<SpeakingState>()((set) => ({
  ...INITIAL,

  startSpeaking: ({ callsign, grid, isHost }) =>
    set({
      current: {
        callsign,
        grid,
        isHost,
        startedAtMs: Date.now()
      }
    }),

  stopSpeaking: () => set({ current: null }),

  setHistory: (list) => set({ history: list })
}))

export function resetSpeakingForTest(): void {
  speakingStore.setState({ ...INITIAL })
}
