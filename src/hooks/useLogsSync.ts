import { useEffect } from 'react'
import { connectionStore } from '@/stores/connection'
import { logsStore } from '@/features/logs/store'
import { QsoService } from '@/lib/qso-service/client'

/**
 * 连接建立后在 App 根部拉取一次服务器 QSO 日志到 `logsStore.all`。
 *
 * 背景：`logsStore.load` 原先只由 LogsView mount 时触发（首次连接自动拉）。
 * 首页仪表盘成为默认落地页后，启动不再经过 `/logs`，导致 TodayStats / Top20 /
 * 老朋友 / 今日已联⭐ 等所有依赖 `logsStore.all` 的消费者在用户访问 `/logs` 前
 * 都拿到空数据。把"首次加载"提到 App 根部、与路由解耦即可修复。
 *
 * 守卫：已有数据或正在加载时不重复拉（与 LogsView 自身的首连接自动拉去重）。
 * 与 useSelfInfo 同样的 connect 触发模式。
 */
export function useLogsSync(): void {
  useEffect(() => {
    const loadIfNeeded = (): void => {
      const { client, status } = connectionStore.getState()
      if (status !== 'connected' || !client) return
      const logs = logsStore.getState()
      if (logs.status === 'loading' || logs.all.length > 0) return
      void logs.load(new QsoService(client))
    }

    loadIfNeeded()

    return connectionStore.subscribe((s, prev) => {
      if (s.status === 'connected' && prev.status !== 'connected') {
        loadIfNeeded()
      }
    })
  }, [])
}
