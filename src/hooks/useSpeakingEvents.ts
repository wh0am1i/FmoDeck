import { useEffect } from 'react'
import i18n from '@/i18n'
import { FmoEventsClient } from '@/lib/fmo-events/client'
import { notify } from '@/lib/notifications'
import { parseCallsignSsid } from '@/lib/utils/callsign'
import { normalizeHost } from '@/lib/utils/url'
import { connectionStore } from '@/stores/connection'
import { settingsStore } from '@/stores/settings'
import { logsStore } from '@/features/logs/store'
import { speakingStore, type SpeakingHistoryItem } from '@/features/speaking/store'

interface CallsignEventData {
  callsign: string
  isSpeaking: boolean
  isHost: boolean
  grid: string
}

/**
 * 新讲话者开口时，若是"新朋友"（从未通联或只通联过 1 次）且不是自己，
 * 触发一条桌面通知。超过 1 次视作老朋友，不打扰。
 * 只在 settings.notificationsEnabled 为 true 时生效；notify() 内部还会
 * 再判一次"页面失焦"才弹，避免在用户正看页面时打扰。
 */
function maybeNotifyNewFriend(callsign: string): void {
  if (!settingsStore.getState().notificationsEnabled) return
  // 跳过：讲话者就是当前用户
  const myCall = settingsStore.getState().currentCallsign
  try {
    if (myCall && parseCallsignSsid(myCall).call === parseCallsignSsid(callsign).call) return
  } catch {
    /* 解析失败不阻塞判断 */
  }
  const { all, local } = logsStore.getState()
  let count = 0
  for (const r of all) if (r.toCallsign === callsign) count++
  for (const r of local) if (r.toCallsign === callsign) count++
  if (count > 1) return
  const title = i18n.t('speaking.newFriendTitle', { callsign })
  const body = i18n.t('speaking.newFriendBody')
  notify(title, body)
}

/**
 * 订阅 fmo.local 的 `/events` WebSocket，把推送事件同步到 speakingStore。
 *
 * 只在 connection 状态为 connected 时启动；settings 变更（protocol/address）
 * 会重新建立连接。与 useFmoSync 分离（主 `/ws` 和 `/events` 独立管理）。
 */
export function useSpeakingEvents(): void {
  useEffect(() => {
    let client: FmoEventsClient | null = null

    const start = () => {
      const { fmoAddresses, activeAddressId, protocol } = settingsStore.getState()
      const addr = fmoAddresses.find((a) => a.id === activeAddressId)
      if (!addr) return

      const url = `${protocol}://${normalizeHost(addr.host)}/events`
      client?.disconnect()
      client = new FmoEventsClient(url)
      client.onEvent((ev) => {
        if (ev.type !== 'qso') return
        if (ev.subType === 'callsign') {
          const data = ev.data as CallsignEventData
          if (data.isSpeaking && data.callsign) {
            maybeNotifyNewFriend(data.callsign)
            speakingStore.getState().startSpeaking({
              callsign: data.callsign,
              grid: data.grid,
              isHost: data.isHost
            })
          } else {
            speakingStore.getState().stopSpeaking()
          }
        } else if (ev.subType === 'history') {
          const list = ev.data as SpeakingHistoryItem[]
          speakingStore.getState().setHistory(list)
        }
      })
      client.connect()
    }

    const stop = () => {
      client?.disconnect()
      client = null
      speakingStore.getState().stopSpeaking()
    }

    // 仅在 connection connected 时启动
    const subscribe = () => {
      const status = connectionStore.getState().status
      if (status === 'connected') start()
      else stop()
    }

    subscribe()

    const unsubConn = connectionStore.subscribe((s, prev) => {
      if (s.status !== prev.status || s.currentUrl !== prev.currentUrl) subscribe()
    })
    const unsubSettings = settingsStore.subscribe((s, prev) => {
      if (
        s.activeAddressId !== prev.activeAddressId ||
        s.protocol !== prev.protocol ||
        s.fmoAddresses !== prev.fmoAddresses
      ) {
        subscribe()
      }
    })

    return () => {
      unsubConn()
      unsubSettings()
      stop()
    }
  }, [])
}
