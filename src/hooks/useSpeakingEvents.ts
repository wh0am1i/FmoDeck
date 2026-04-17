import { useEffect } from 'react'
import { FmoEventsClient } from '@/lib/fmo-events/client'
import { normalizeHost } from '@/lib/utils/url'
import { connectionStore } from '@/stores/connection'
import { settingsStore } from '@/stores/settings'
import { speakingStore, type SpeakingHistoryItem } from '@/features/speaking/store'

interface CallsignEventData {
  callsign: string
  isSpeaking: boolean
  isHost: boolean
  grid: string
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
