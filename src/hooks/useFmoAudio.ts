import { useEffect, useRef } from 'react'
import { AudioEngine } from '@/lib/audio/engine'
import { normalizeHost } from '@/lib/utils/url'
import { audioStore } from '@/features/audio/store'
import { connectionStore } from '@/stores/connection'
import { settingsStore } from '@/stores/settings'

/**
 * 音频下行管理：跟随 audioStore.enabled 与 settings.activeAddress，
 * 在连接建立时起 AudioEngine；disable / 换地址 / 断连时 stop。
 *
 * 注意：AudioEngine.start() 必须在用户手势触发的回调里调用（浏览器
 * AudioContext 解锁要求）。这里只根据 store 状态做 start/stop 驱动；
 * 首次 enable 由 UI 按钮点击触发（满足手势要求）。
 */
export function useFmoAudio(): void {
  const engineRef = useRef<AudioEngine | null>(null)

  useEffect(() => {
    const sync = () => {
      const { enabled, volume, muted } = audioStore.getState()
      const connStatus = connectionStore.getState().status
      const { fmoAddresses, activeAddressId, protocol } = settingsStore.getState()
      const addr = fmoAddresses.find((a) => a.id === activeAddressId)

      // 必须：enabled + 已连接 + 有地址
      const shouldRun = enabled && connStatus === 'connected' && !!addr

      if (!shouldRun) {
        if (engineRef.current) {
          engineRef.current.stop()
          engineRef.current = null
          audioStore.getState().setStatus('idle')
        }
        return
      }

      // 需要起（或换地址重建）
      const url = `${protocol}://${normalizeHost(addr.host)}/audio`
      if (engineRef.current) {
        // 粗略判断：如果已经有引擎就继续用（切地址的场景走 stop+start 重建）
        return
      }

      const engine = new AudioEngine(url, {
        onStatus: (s, err) => {
          audioStore.getState().setStatus(s, err?.message ?? null)
        }
      })
      engineRef.current = engine
      engine.setVolume(volume)
      engine.setMuted(muted)
      void engine.start()
    }

    sync()

    const unsubAudio = audioStore.subscribe((s, prev) => {
      if (s.enabled !== prev.enabled) sync()
      if (s.volume !== prev.volume) engineRef.current?.setVolume(s.volume)
      if (s.muted !== prev.muted) engineRef.current?.setMuted(s.muted)
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
        // 地址变了，先 stop 再 sync
        engineRef.current?.stop()
        engineRef.current = null
        audioStore.getState().setStatus('idle')
        sync()
      }
    })

    return () => {
      unsubAudio()
      unsubConn()
      unsubSettings()
      engineRef.current?.stop()
      engineRef.current = null
    }
  }, [])
}
