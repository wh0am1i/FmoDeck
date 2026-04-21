// src/features/sstv/store.ts
import { create } from 'zustand'
import type { SstvMode } from '@/types/sstv'
import type { Mode } from '@/lib/sstv/modes/types'

type SstvStatus = 'idle' | 'waiting' | 'decoding' | 'done' | 'timeout'

export interface RecentDecodeEntry {
  id: string
  mode: SstvMode
  displayName: string
  rgba: Uint8ClampedArray
  width: number
  height: number
  createdAt: number
}

export interface SstvState {
  status: SstvStatus
  activeMode: SstvMode | null
  /** 解码进度 0..1;仅 decoding 有效。 */
  progress: number
  /** 当前帧 rgba 缓冲;decoding/done 时有效,否则 null。SstvCanvas 订阅此来画图。 */
  currentRgba: Uint8ClampedArray | null
  /** 当前帧的宽/高。 */
  currentWidth: number
  currentHeight: number
  /** 当前已解到第几行;-1 表示还没开始或已清空(SstvCanvas 判断增量画)。 */
  lastRow: number
  /** 最近一次完整解码的时间戳(ms)。 */
  lastDoneAt: number | null
  /** 后台模式下产生的未读图数量。 */
  unreadCount: number
  lastError: string | null
  /** 最近完成的几张解码结果(不含进行中的 live),最多 5 张,最新在前。 */
  recentDecodes: RecentDecodeEntry[]

  /** 内部方法,decoder session 调用 */
  onDecoderStart: (mode: Mode) => void
  onDecoderRow: (row: number, rgba: Uint8ClampedArray, mode: Mode) => void
  onDecoderDone: (mode: Mode) => void
  onDecoderTimeout: () => void
  setWaiting: () => void
  setIdle: () => void
  setError: (e: string | null) => void

  /** 每次成功写 IDB 后 +1,history 监听此字段重新加载 */
  savedCount: number
  incrementSavedCount: () => void

  /** 公开方法 */
  incrementUnread: () => void
  markAllRead: () => void
}

export const sstvStore = create<SstvState>((set, get) => ({
  status: 'idle',
  activeMode: null,
  progress: 0,
  currentRgba: null,
  currentWidth: 0,
  currentHeight: 0,
  lastRow: -1,
  lastDoneAt: null,
  unreadCount: 0,
  savedCount: 0,
  lastError: null,
  recentDecodes: [],

  onDecoderStart: (mode) => {
    // 分配新的 rgba buffer
    const buf = new Uint8ClampedArray(mode.width * mode.height * 4)
    set({
      status: 'decoding',
      activeMode: mode.name,
      progress: 0,
      currentRgba: buf,
      currentWidth: mode.width,
      currentHeight: mode.height,
      lastRow: -1
    })
  },
  onDecoderRow: (row, rgba, mode) => {
    const buf = get().currentRgba
    if (buf?.length !== mode.width * mode.height * 4) return
    // 写入对应行
    buf.set(rgba, row * mode.width * 4)
    set({
      progress: (row + 1) / mode.height,
      lastRow: row
    })
  },
  onDecoderDone: (mode) => {
    const rgba = get().currentRgba
    if (!rgba) {
      set({ status: 'done', progress: 1, lastDoneAt: Date.now() })
      return
    }
    const entry: RecentDecodeEntry = {
      id: String(Date.now()) + '-' + Math.random().toString(36).slice(2, 6),
      mode: mode.name,
      displayName: mode.displayName,
      rgba: new Uint8ClampedArray(rgba), // 深拷贝,防止下次 onDecoderStart 覆盖同一 buffer
      width: mode.width,
      height: mode.height,
      createdAt: Date.now()
    }
    set((s) => ({
      status: 'done',
      progress: 1,
      lastDoneAt: entry.createdAt,
      activeMode: mode.name,
      recentDecodes: [entry, ...s.recentDecodes].slice(0, 5)
    }))
    // 注意:currentRgba 保留不清空,canvas 需要
  },
  onDecoderTimeout: () => {
    set({
      status: 'timeout',
      currentRgba: null,
      lastRow: -1
    })
    // 1.5s 后自动回 waiting(如果 decoder 还在监听)
    setTimeout(() => {
      const st = get()
      if (st.status === 'timeout') {
        set({ status: 'waiting', activeMode: null, progress: 0 })
      }
    }, 1500)
  },
  setWaiting: () => set({ status: 'waiting' }),
  setIdle: () =>
    set({
      status: 'idle',
      activeMode: null,
      progress: 0,
      currentRgba: null,
      lastRow: -1
      // recentDecodes 保留,跨 session 的最近记忆
    }),
  setError: (lastError) => set({ lastError }),

  incrementSavedCount: () => set((s) => ({ savedCount: s.savedCount + 1 })),
  incrementUnread: () => set((s) => ({ unreadCount: s.unreadCount + 1 })),
  markAllRead: () => set({ unreadCount: 0 })
}))
