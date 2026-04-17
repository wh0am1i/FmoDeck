import { create } from 'zustand'
import type { MessageService } from '@/lib/message-service/client'
import type { MessageSummary } from '@/types/message'

export type MessagesStatus = 'idle' | 'loading' | 'error'

export interface MessagesState {
  list: MessageSummary[]
  status: MessagesStatus
  error: Error | null

  load: (svc: MessageService) => Promise<void>
  /** 新推送的摘要 prepend 到最前（不去重 → store 内部去重）。 */
  prependSummary: (s: MessageSummary) => void
  markRead: (messageId: string) => void
}

const INITIAL = {
  list: [] as MessageSummary[],
  status: 'idle' as MessagesStatus,
  error: null as Error | null
}

export const messagesStore = create<MessagesState>()((set) => ({
  ...INITIAL,

  load: async (svc: MessageService) => {
    set({ status: 'loading', error: null })
    try {
      const page = await svc.getList()
      set({ list: page.list, status: 'idle' })
    } catch (err) {
      set({
        status: 'error',
        error: err instanceof Error ? err : new Error(String(err))
      })
    }
  },

  prependSummary: (s: MessageSummary) =>
    set((state) =>
      state.list.some((m) => m.messageId === s.messageId)
        ? state
        : { list: [s, ...state.list] }
    ),

  markRead: (messageId: string) =>
    set((state) => ({
      list: state.list.map((m) => (m.messageId === messageId ? { ...m, isRead: true } : m))
    }))
}))

export function selectUnreadCount(s: MessagesState): number {
  return s.list.filter((m) => !m.isRead).length
}

export function resetMessagesForTest(): void {
  messagesStore.setState({ ...INITIAL })
}
