import { create } from 'zustand'
import type { QsoService } from '@/lib/qso-service/client'
import type { QsoSummary } from '@/types/qso'

export type LogsStatus = 'idle' | 'loading' | 'error'

export interface LogsState {
  all: QsoSummary[]
  filter: string
  page: number
  pageSize: number
  status: LogsStatus
  error: Error | null

  load: (svc: QsoService) => Promise<void>
  setFilter: (s: string) => void
  setPage: (n: number) => void
}

const INITIAL = {
  all: [] as QsoSummary[],
  filter: '',
  page: 0,
  pageSize: 20,
  status: 'idle' as LogsStatus,
  error: null as Error | null
}

export const logsStore = create<LogsState>()((set) => ({
  ...INITIAL,

  load: async (svc: QsoService) => {
    set({ status: 'loading', error: null })
    try {
      const all = await svc.getList()
      set({ all, status: 'idle', page: 0 })
    } catch (err) {
      set({
        status: 'error',
        error: err instanceof Error ? err : new Error(String(err))
      })
    }
  },

  setFilter: (s: string) => set({ filter: s, page: 0 }),

  setPage: (n: number) => set({ page: Math.max(0, n) })
}))

/** 按 filter 前缀匹配 toCallsign（大小写无关）。 */
export function selectFiltered(s: LogsState): QsoSummary[] {
  const q = s.filter.trim().toUpperCase()
  if (!q) return s.all
  return s.all.filter((r) => r.toCallsign.toUpperCase().startsWith(q))
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
