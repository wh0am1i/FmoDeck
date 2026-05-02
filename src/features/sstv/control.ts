// src/features/sstv/control.ts
import { create } from 'zustand'

/**
 * SSTV decoder 的命令式控制通道。
 *
 * 用途:UI 触发"按指定 mode 强制解码最近 N 秒"等动作。
 * 由 useSstvDecoder 在 attach 时注册 handler,detach 时清空。
 * 没有 handler 时(decoder 还没起、用户没在 SSTV tab),调用返回 false。
 */
interface SstvControlStore {
  forceStartHandler: ((visCode: number, fromMsAgo: number) => boolean) | null
  setForceStartHandler: (h: ((visCode: number, fromMsAgo: number) => boolean) | null) => void
}

export const sstvControlStore = create<SstvControlStore>((set) => ({
  forceStartHandler: null,
  setForceStartHandler: (h) => set({ forceStartHandler: h })
}))

export function tryForceStart(visCode: number, fromMsAgo: number): boolean {
  const handler = sstvControlStore.getState().forceStartHandler
  if (!handler) return false
  return handler(visCode, fromMsAgo)
}
