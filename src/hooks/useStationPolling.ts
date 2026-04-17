import { useEffect } from 'react'
import { StationService } from '@/lib/station-service/client'
import { connectionStore } from '@/stores/connection'
import { stationStore } from '@/features/station/store'

const POLL_INTERVAL_MS = 15_000

/**
 * 周期性从服务器拉当前中继。
 *
 * 动机：用户在 FMO 设备物理按钮上切中继时，前端没有事件可订阅，只能轮询。
 * 拿到新的 current 后 stationStore 触发订阅，useStationSync 会连带重拉日志。
 *
 * 策略：仅在 connection 状态为 connected 时启动；tab 切回前台时立即补拉
 * 一次（用户从其他 tab 回来第一眼看到的应该是最新状态）。
 */
export function useStationPolling(): void {
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null

    const tick = () => {
      const client = connectionStore.getState().client
      if (!client || connectionStore.getState().status !== 'connected') return
      void stationStore.getState().loadCurrent(new StationService(client))
    }

    const start = () => {
      if (timer) return
      tick()
      timer = setInterval(tick, POLL_INTERVAL_MS)
    }

    const stop = () => {
      if (timer) {
        clearInterval(timer)
        timer = null
      }
    }

    const onVis = () => {
      if (document.visibilityState === 'visible') tick()
    }

    const sync = () => {
      if (connectionStore.getState().status === 'connected') start()
      else stop()
    }

    sync()
    const unsub = connectionStore.subscribe((s, prev) => {
      if (s.status !== prev.status) sync()
    })
    document.addEventListener('visibilitychange', onVis)

    return () => {
      unsub()
      document.removeEventListener('visibilitychange', onVis)
      stop()
    }
  }, [])
}
