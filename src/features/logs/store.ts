import { create } from 'zustand'
import type { QsoService } from '@/lib/qso-service/client'
import type { SyncMode } from '@/stores/settings'
import type { QsoSummary } from '@/types/qso'

export type LogsStatus = 'idle' | 'loading' | 'error'

export interface LogsState {
  all: QsoSummary[]
  filter: string
  page: number
  pageSize: number
  status: LogsStatus
  error: Error | null
  /**
   * 当前生效的同步模式，从 active FmoAddress 镜像过来（由 useSyncPolicy 维护）。
   * 默认 `all`；为 `today` 时选择器按本地时区"今天 00:00 起"过滤 `all`。
   */
  syncMode: SyncMode

  load: (svc: QsoService) => Promise<void>
  setFilter: (s: string) => void
  setPage: (n: number) => void
  setSyncMode: (m: SyncMode) => void
}

const INITIAL = {
  all: [] as QsoSummary[],
  filter: '',
  page: 0,
  pageSize: 20,
  status: 'idle' as LogsStatus,
  error: null as Error | null,
  syncMode: 'all' as SyncMode
}

/** 本地时区"今天 00:00"的 Unix 秒。 */
function startOfLocalToday(nowMs: number = Date.now()): number {
  const d = new Date(nowMs)
  d.setHours(0, 0, 0, 0)
  return Math.floor(d.getTime() / 1000)
}

export const logsStore = create<LogsState>()((set, get) => ({
  ...INITIAL,

  load: async (svc: QsoService) => {
    set({ status: 'loading', error: null })
    const { syncMode, all: existing } = get()
    try {
      if (syncMode === 'incremental' && existing.length > 0) {
        // 增量：按已有最大 logId 边界 stopAt，拉回来的全部是新记录
        const maxExistingLogId = existing[0]?.logId ?? 0
        const fresh = await svc.getListAll({
          stopAt: (r) => r.logId <= maxExistingLogId
        })
        set({ all: [...fresh, ...existing], status: 'idle', page: 0 })
      } else if (syncMode === 'today') {
        const cutoff = startOfLocalToday()
        const all = await svc.getListAll({ stopAt: (r) => r.timestamp < cutoff })
        set({ all, status: 'idle', page: 0 })
      } else {
        // 'all' 或 incremental 首次加载
        const all = await svc.getListAll({})
        set({ all, status: 'idle', page: 0 })
      }
    } catch (err) {
      set({
        status: 'error',
        error: err instanceof Error ? err : new Error(String(err))
      })
    }
  },

  setFilter: (s: string) => set({ filter: s, page: 0 }),

  setPage: (n: number) => set({ page: Math.max(0, n) }),

  setSyncMode: (m: SyncMode) => set((s) => (s.syncMode === m ? s : { syncMode: m, page: 0 }))
}))

/**
 * 应用 syncMode 后的日志 "有效全量"。
 * - `all`：原样返回
 * - `today`：筛掉 timestamp < 今日本地 00:00 的记录
 *
 * 所有其他选择器（filter / page / top20 / old-friends）都在此之上派生。
 */
export function selectSyncedAll(s: LogsState): QsoSummary[] {
  if (s.syncMode !== 'today') return s.all
  const cutoff = startOfLocalToday()
  return s.all.filter((r) => r.timestamp >= cutoff)
}

/** 文本过滤（基于 syncMode 筛过的列表）。 */
export function selectFiltered(s: LogsState): QsoSummary[] {
  const base = selectSyncedAll(s)
  const q = s.filter.trim().toUpperCase()
  if (!q) return base
  return base.filter((r) => r.toCallsign.toUpperCase().startsWith(q))
}

/** 当前页的记录。 */
export function selectPageSlice(s: LogsState): QsoSummary[] {
  const filtered = selectFiltered(s)
  const start = s.page * s.pageSize
  return filtered.slice(start, start + s.pageSize)
}

/** 总页数（至少 1 页）。 */
export function selectTotalPages(s: LogsState): number {
  const n = selectFiltered(s).length
  return Math.max(1, Math.ceil(n / s.pageSize))
}

export function resetLogsForTest(): void {
  logsStore.setState({ ...INITIAL })
}
