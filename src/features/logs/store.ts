import { create } from 'zustand'
import { parseAdif } from '@/lib/adif/parser'
import { adifRecordsToLocal } from '@/lib/adif/import'
import { clearAllLocalQsos, insertLocalQsos, loadAllLocalQsos } from '@/lib/db/qso-repo'
import type { QsoService } from '@/lib/qso-service/client'
import type { SyncMode } from '@/stores/settings'
import type { LocalQso, QsoSummary } from '@/types/qso'

export type LogsStatus = 'idle' | 'loading' | 'error'

/** 客户端日期过滤（与 syncMode 正交：syncMode 决定从服务器拉什么，dateFilter 决定展示什么）。 */
export type DateFilter = 'all' | 'today' | '7d' | '30d'

/**
 * 表格/聚合展示用的行。合并 server 和本地 ADIF 导入两种来源。
 * 下游（filter / page / top20 / old-friends / speaking-bar 统计）都基于此类型。
 */
export type DisplayRow = {
  timestamp: number
  toCallsign: string
  grid: string
} & ({ source: 'server'; logId: number } | { source: 'local'; localId: string })

/** React key 辅助（稳定、不冲突）。 */
export function rowKey(row: DisplayRow): string {
  return row.source === 'server' ? `s-${row.logId}` : `l-${row.localId}`
}

export interface LogsState {
  /** 服务器拉回来的原样记录。 */
  all: QsoSummary[]
  /** ADIF 导入的本地记录（IndexedDB 镜像）。 */
  local: LocalQso[]
  filter: string
  dateFilter: DateFilter
  page: number
  pageSize: number
  status: LogsStatus
  error: Error | null
  syncMode: SyncMode

  load: (svc: QsoService) => Promise<void>
  loadLocal: () => Promise<void>
  /** 导入 ADIF 文本 / bytes → 解析 → 入 IndexedDB → 更新内存。 */
  importAdif: (input: string | ArrayBuffer | Uint8Array) => Promise<{
    imported: number
    skipped: number
  }>
  clearLocal: () => Promise<void>
  setFilter: (s: string) => void
  setDateFilter: (f: DateFilter) => void
  setPage: (n: number) => void
  setSyncMode: (m: SyncMode) => void
}

const INITIAL = {
  all: [] as QsoSummary[],
  local: [] as LocalQso[],
  filter: '',
  dateFilter: 'all' as DateFilter,
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

/** 保证日志按时间倒序（服务器通常按 logId DESC，但偶有延迟入库的记录 logId 顺序与 timestamp 不一致）。 */
function sortByTimeDesc(list: readonly QsoSummary[]): QsoSummary[] {
  return [...list].sort((a, b) => b.timestamp - a.timestamp)
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
        set({ all: sortByTimeDesc([...fresh, ...existing]), status: 'idle', page: 0 })
      } else if (syncMode === 'today') {
        const cutoff = startOfLocalToday()
        const all = await svc.getListAll({ stopAt: (r) => r.timestamp < cutoff })
        set({ all: sortByTimeDesc(all), status: 'idle', page: 0 })
      } else {
        // 'all' 或 incremental 首次加载
        const all = await svc.getListAll({})
        set({ all: sortByTimeDesc(all), status: 'idle', page: 0 })
      }
    } catch (err) {
      set({
        status: 'error',
        error: err instanceof Error ? err : new Error(String(err))
      })
    }
  },

  loadLocal: async () => {
    try {
      const local = await loadAllLocalQsos()
      set({ local })
    } catch (err) {
      set({ error: err instanceof Error ? err : new Error(String(err)) })
    }
  },

  importAdif: async (input) => {
    const parsed = parseAdif(input)
    const { imported, skipped } = adifRecordsToLocal(parsed.records ?? [])
    if (imported.length > 0) {
      await insertLocalQsos(imported)
      const local = await loadAllLocalQsos()
      set({ local, page: 0 })
    }
    return { imported: imported.length, skipped }
  },

  clearLocal: async () => {
    await clearAllLocalQsos()
    set({ local: [], page: 0 })
  },

  setFilter: (s: string) => set({ filter: s, page: 0 }),

  setDateFilter: (f: DateFilter) => set({ dateFilter: f, page: 0 }),

  setPage: (n: number) => set({ page: Math.max(0, n) }),

  setSyncMode: (m: SyncMode) => set((s) => (s.syncMode === m ? s : { syncMode: m, page: 0 }))
}))

/**
 * 合并 server + local 的所有记录为 DisplayRow[]，按 timestamp 倒序。
 * syncMode='today' 在这里统一筛掉非当天。
 */
export function selectMergedRows(s: LogsState): DisplayRow[] {
  const cutoff = s.syncMode === 'today' ? startOfLocalToday() : null
  const rows: DisplayRow[] = []
  for (const r of s.all) {
    if (cutoff !== null && r.timestamp < cutoff) continue
    rows.push({
      source: 'server',
      logId: r.logId,
      timestamp: r.timestamp,
      toCallsign: r.toCallsign,
      grid: r.grid
    })
  }
  for (const r of s.local) {
    if (cutoff !== null && r.timestamp < cutoff) continue
    rows.push({
      source: 'local',
      localId: r.id,
      timestamp: r.timestamp,
      toCallsign: r.toCallsign,
      grid: r.grid
    })
  }
  return rows.sort((a, b) => b.timestamp - a.timestamp)
}

/**
 * @deprecated 保留以防下游误用；优先 selectMergedRows。
 * 应用 syncMode 后的**服务器** "有效全量"，不含 local。
 */
export function selectSyncedAll(s: LogsState): QsoSummary[] {
  if (s.syncMode !== 'today') return s.all
  const cutoff = startOfLocalToday()
  return s.all.filter((r) => r.timestamp >= cutoff)
}

/** 日期过滤的 Unix 秒下界；`'all'` 返回 null 表示不过滤。 */
function dateFilterCutoff(f: DateFilter, nowMs: number = Date.now()): number | null {
  if (f === 'all') return null
  if (f === 'today') {
    const d = new Date(nowMs)
    d.setHours(0, 0, 0, 0)
    return Math.floor(d.getTime() / 1000)
  }
  const days = f === '7d' ? 7 : 30
  return Math.floor(nowMs / 1000) - days * 86400
}

/** 文本 + 日期过滤（在 merged + syncMode 基础上叠加）。 */
export function selectFiltered(s: LogsState): DisplayRow[] {
  const base = selectMergedRows(s)
  const q = s.filter.trim().toUpperCase()
  const cutoff = dateFilterCutoff(s.dateFilter)
  return base.filter((r) => {
    if (cutoff !== null && r.timestamp < cutoff) return false
    if (q && !r.toCallsign.toUpperCase().startsWith(q)) return false
    return true
  })
}

/** 当前页的记录。 */
export function selectPageSlice(s: LogsState): DisplayRow[] {
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
