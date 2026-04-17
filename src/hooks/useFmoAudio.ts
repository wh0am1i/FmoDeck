import { useEffect, useRef } from 'react'
import { AudioEngine } from '@/lib/audio/engine'
import { parseCallsignSsid } from '@/lib/utils/callsign'
import { normalizeHost } from '@/lib/utils/url'
import { audioStore } from '@/features/audio/store'
import { connectionStore } from '@/stores/connection'
import { settingsStore } from '@/stores/settings'
import { speakingStore } from '@/features/speaking/store'

/**
 * 音频下行管理：跟随 audioStore.enabled 与 settings.activeAddress，
 * 在连接建立时起 AudioEngine；disable / 换地址 / 断连时 stop。
 *
 * 自言自语过滤：当检测到当前讲话者是自己（settings.currentCallsign
 * 与 speaking.current.callsign 基号匹配）时，暂停音频输出，避免听到
 * 自己经设备回授的声音。
 *
 * 注意：AudioEngine.start() 必须在用户手势触发的回调里调用（浏览器
 * AudioContext 解锁要求）。这里只根据 store 状态做 start/stop 驱动；
 * 首次 enable 由 UI 按钮点击触发（满足手势要求）。
 */

function isSameOperator(a: string, b: string): boolean {
  if (!a || !b) return false
  try {
    return parseCallsignSsid(a).call === parseCallsignSsid(b).call
  } catch {
    return false
  }
}

export function useFmoAudio(): void {
  const engineRef = useRef<AudioEngine | null>(null)

  useEffect(() => {
    const sync = () => {
      const { enabled, volume, muted } = audioStore.getState()
      const connStatus = connectionStore.getState().status
      const { fmoAddresses, activeAddressId, protocol } = settingsStore.getState()
      const addr = fmoAddresses.find((a) => a.id === activeAddressId)

      const shouldRun = enabled && connStatus === 'connected' && !!addr

      if (!shouldRun) {
        if (engineRef.current) {
          engineRef.current.stop()
          engineRef.current = null
          audioStore.getState().setStatus('idle')
        }
        return
      }

      if (engineRef.current) return

      const url = `${protocol}://${normalizeHost(addr.host)}/audio`
      const engine = new AudioEngine(url, {
        onStatus: (s, err) => {
          audioStore.getState().setStatus(s, err?.message ?? null)
        }
      })
      engineRef.current = engine
      engine.setVolume(volume)
      engine.setMuted(muted || isSelfSpeaking())
      void engine.start()
    }

    const isSelfSpeaking = (): boolean => {
      const current = speakingStore.getState().current
      const my = settingsStore.getState().currentCallsign
      return !!current && isSameOperator(current.callsign, my)
    }

    const applySuppress = () => {
      const userMuted = audioStore.getState().muted
      engineRef.current?.setMuted(userMuted || isSelfSpeaking())
    }

    sync()

    const unsubAudio = audioStore.subscribe((s, prev) => {
      if (s.enabled !== prev.enabled) sync()
      if (s.volume !== prev.volume) engineRef.current?.setVolume(s.volume)
      if (s.muted !== prev.muted) applySuppress()
    })

    const unsubConn = connectionStore.subscribe((s, prev) => {
      if (s.status !== prev.status) sync()
    })

    const unsubSettings = settingsStore.subscribe((s, prev) => {
      if (
        s.activeAddressId !== prev.activeAddressId ||
        s.protocol !== prev.protocol ||
        s.fmoAddresses !== prev.fmoAddresses
      ) {
        engineRef.current?.stop()
        engineRef.current = null
        audioStore.getState().setStatus('idle')
        sync()
      }
      if (s.currentCallsign !== prev.currentCallsign) applySuppress()
    })

    const unsubSpeaking = speakingStore.subscribe((s, prev) => {
      if (s.current?.callsign !== prev.current?.callsign) applySuppress()
    })

    return () => {
      unsubAudio()
      unsubConn()
      unsubSettings()
      unsubSpeaking()
      engineRef.current?.stop()
      engineRef.current = null
    }
  }, [])
}
