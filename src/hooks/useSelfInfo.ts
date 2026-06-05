import { useEffect } from 'react'
import { connectionStore } from '@/stores/connection'
import { selfStore } from '@/stores/self'
import { UserService } from '@/lib/user-service/client'
import { QsoService } from '@/lib/qso-service/client'
import { ConfigService } from '@/lib/config-service/client'
import type { FmoApiClient } from '@/lib/fmo-api/client'

/**
 * 连接建立后拉取自己的呼号写入 `selfStore`，用于消息列表/详情判断进出方向。
 *
 * 优先级：
 *   1. `user/getInfo` —— 直接返回 callsign（新固件）
 *   2. fallback：拉一页 `qso/getList`，取最新一条做 `qso/getDetail`，
 *      其 `fromCallsign` 即为本机呼号（QSO 记录从设备视角写）
 *
 * 两路都失败则保持 null，UI 退化为不显示方向标记。
 * 断开 / 切换连接时清空。
 */
async function resolveSelfCallsign(client: FmoApiClient): Promise<string | null> {
  try {
    const info = await new UserService(client).getInfo()
    if (info.callsign) return info.callsign
  } catch {
    // 老固件无 user/getInfo,走 QSO 兜底
  }
  try {
    const qso = new QsoService(client)
    const list = await qso.getList()
    const latest = list[0]
    if (!latest) return null
    const detail = await qso.getDetail(latest.logId)
    return detail.fromCallsign || null
  } catch {
    return null
  }
}

export function useSelfInfo(): void {
  useEffect(() => {
    let cancelled = false

    async function fetchOnce(): Promise<void> {
      const { client, status } = connectionStore.getState()
      if (status !== 'connected' || !client) return
      const callsign = await resolveSelfCallsign(client)
      if (cancelled) return
      if (callsign) selfStore.getState().setCallsign(callsign)
      try {
        const coord = await new ConfigService(client).getCoordinate()
        if (cancelled) return
        if (coord) selfStore.getState().setCoordinate(coord)
      } catch {
        // 坐标为可选特性，失败忽略
      }
    }

    void fetchOnce()

    const unsub = connectionStore.subscribe((s, prev) => {
      if (s.status === 'connected' && prev.status !== 'connected') {
        void fetchOnce()
      } else if (s.status !== 'connected' && prev.status === 'connected') {
        selfStore.getState().setCallsign(null)
        selfStore.getState().setCoordinate(null)
      }
    })

    return () => {
      cancelled = true
      unsub()
    }
  }, [])
}
