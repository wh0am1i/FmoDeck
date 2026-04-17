import { create } from 'zustand'
import type { MessageService } from '@/lib/message-service/client'
import type { MessageSummary } from '@/types/message'

export type MessagesStatus = 'idle' | 'loading' | 'loadingMore' | 'error'

export interface MessagesState {
  list: MessageSummary[]
  /** 下一页游标；0 表示已到末尾；null 表示尚未加载过。 */
  nextAnchorId: number | null
  status: MessagesStatus
  error: Error | null

  /** 首次加载或刷新：清空并从头拉第 1 页。 */
  load: (svc: MessageService) => Promise<void>
  /** 拉下一页并 append 到 list。必须先调过 load 至少一次。 */
  loadMore: (svc: MessageService) => Promise<void>
  /** 新推送的摘要 prepend 到最前（按 messageId 去重）。 */
  prependSummary: (s: MessageSummary) => void
  markRead: (messageId: string) => void
  /** 批量标已读：对所有 isRead=false 的条目调 svc.setRead，然后本地全部置为已读。 */
  markAllRead: (svc: MessageService) => Promise<number>
}

const INITIAL = {
  list: [] as MessageSummary[],
  nextAnchorId: null as number | null,
  status: 'idle' as MessagesStatus,
  error: null as Error | null
}

function handleError(err: unknown): Error {
  return err instanceof Error ? err : new Error(String(err))
}

export const messagesStore = create<MessagesState>()((set, get) => ({
  ...INITIAL,

  load: async (svc: MessageService) => {
    set({ status: 'loading', error: null })
    try {
      const page = await svc.getList()
      set({
        list: page.list,
        nextAnchorId: page.nextAnchorId,
        status: 'idle'
      })
    } catch (err) {
      set({ status: 'error', error: handleError(err) })
    }
  },

  loadMore: async (svc: MessageService) => {
    const { nextAnchorId, list, status } = get()
    if (status === 'loadingMore' || status === 'loading') return
    if (nextAnchorId === null || nextAnchorId === 0) return

    set({ status: 'loadingMore', error: null })
    try {
      const page = await svc.getList({ anchorId: nextAnchorId })
      // append + 去重（保底，避免服务端边界重复）
      const existingIds = new Set(list.map((m) => m.messageId))
      const merged = [...list, ...page.list.filter((m) => !existingIds.has(m.messageId))]
      set({
        list: merged,
        nextAnchorId: page.nextAnchorId,
        status: 'idle'
      })
    } catch (err) {
      set({ status: 'error', error: handleError(err) })
    }
  },

  prependSummary: (s: MessageSummary) =>
    set((state) =>
      state.list.some((m) => m.messageId === s.messageId) ? state : { list: [s, ...state.list] }
    ),

  markRead: (messageId: string) =>
    set((state) => ({
      list: state.list.map((m) => (m.messageId === messageId ? { ...m, isRead: true } : m))
    })),

  markAllRead: async (svc: MessageService) => {
    const unread = get().list.filter((m) => !m.isRead)
    // 并发但限制在 8 路，避免对设备 WS 压力过大
    const CONCURRENCY = 8
    let cursor = 0
    async function worker(): Promise<void> {
      while (cursor < unread.length) {
        const m = unread[cursor++]
        if (!m) return
        try {
          await svc.setRead(m.messageId)
        } catch {
          /* 单条失败忽略，不阻塞其他 */
        }
      }
    }
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, unread.length) }, worker))
    set((state) => ({ list: state.list.map((m) => ({ ...m, isRead: true })) }))
    return unread.length
  }
}))

export function selectUnreadCount(s: MessagesState): number {
  return s.list.filter((m) => !m.isRead).length
}

/** 是否还能加载更多页。 */
export function selectHasMore(s: MessagesState): boolean {
  return s.nextAnchorId !== null && s.nextAnchorId !== 0
}

export function resetMessagesForTest(): void {
  messagesStore.setState({ ...INITIAL })
}
