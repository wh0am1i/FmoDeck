import { useEffect } from 'react'
import { logsStore } from '@/features/logs/store'
import { QsoService } from '@/lib/qso-service/client'
import { connectionStore } from '@/stores/connection'
import { stationStore } from '@/features/station/store'

/**
 * 站点（中继）切换后自动刷新 logs 缓存。
 *
 * 背景：LogsView / Top20 / OldFriends 都基于 `logsStore.all` 派生。
 * 切换 station 后服务器返回的是新中继的 QSO，前端缓存需要替换。
 *
 * 策略：订阅 stationStore，观察 `current.uid` 变化。
 * - 初次加载（`prev` 为 null）不触发（避免无谓的重拉）
 * - 真正切换时清空 `logsStore.all` 并重新 `load`
 */
export function useStationSync(): void {
  useEffect(() => {
    return stationStore.subscribe((s, prev) => {
      const currentUid = s.current?.uid ?? null
      const previousUid = prev.current?.uid ?? null

      // 跳过：初次从 null 设置 / 未变 / 清空
      if (previousUid === null || currentUid === null || previousUid === currentUid) {
        return
      }

      const client = connectionStore.getState().client
      if (!client) return

      // 清当前缓存并触发 load（保留 syncMode 不变）
      logsStore.setState({ all: [], page: 0 })
      void logsStore.getState().load(new QsoService(client))
    })
  }, [])
}
