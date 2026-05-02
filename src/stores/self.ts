import { create } from 'zustand'
import { parseCallsignSsid } from '@/lib/utils/callsign'

export interface SelfState {
  /** 当前设备的复合呼号（如 `BH6SCA-9`），未知时为 null。 */
  callsign: string | null
  setCallsign: (c: string | null) => void
}

export const selfStore = create<SelfState>()((set) => ({
  callsign: null,
  setCallsign: (callsign) => set({ callsign })
}))

/** 取基号（去 SSID）。无法解析时回退原串大写。 */
function baseCall(s: string): string {
  if (!s) return ''
  try {
    return parseCallsignSsid(s).call.toUpperCase()
  } catch {
    return s.toUpperCase()
  }
}

/**
 * 判断给定 `from` 是否就是"我"——只比较基号，避免 SSID 不一致误判
 * （比如 self 是 `BH6SCA-9`，server 把消息标成 `from: "BH6SCA-1"`）。
 */
export function isFromSelf(from: string, selfCallsign: string | null): boolean {
  if (!selfCallsign || !from) return false
  return baseCall(from) === baseCall(selfCallsign)
}

export function resetSelfForTest(): void {
  selfStore.setState({ callsign: null })
}
