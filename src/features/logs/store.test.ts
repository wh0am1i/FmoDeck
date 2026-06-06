import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  logsStore,
  resetLogsForTest,
  selectFiltered,
  selectPageSlice,
  selectSyncedAll,
  selectTodaysStats,
  selectTotalPages
} from './store'
import type { QsoService } from '@/lib/qso-service/client'
import type { QsoSummary } from '@/types/qso'

function mockSvc(list: QsoSummary[]): QsoService {
  // mock getListAll 忽略 options，返回传入的列表
  return {
    getListAll: vi.fn().mockResolvedValue(list)
  } as unknown as QsoService
}

function makeSummary(overrides: Partial<QsoSummary> = {}): QsoSummary {
  return {
    logId: 1,
    timestamp: 1776358502,
    toCallsign: 'BI2RCY',
    grid: 'PN11rr',
    ...overrides
  }
}

afterEach(() => {
  resetLogsForTest()
})

describe('logs store · load', () => {
  it('load 后填充 all，status=idle', async () => {
    const svc = mockSvc([makeSummary({ logId: 1 }), makeSummary({ logId: 2 })])
    await logsStore.getState().load(svc)
    expect(logsStore.getState().all).toHaveLength(2)
    expect(logsStore.getState().status).toBe('idle')
  })

  it('load 失败时 status=error 并保存 error', async () => {
    const svc = {
      getListAll: vi.fn().mockRejectedValue(new Error('boom'))
    } as unknown as QsoService
    await logsStore.getState().load(svc)
    expect(logsStore.getState().status).toBe('error')
    expect(logsStore.getState().error?.message).toBe('boom')
  })

  it('syncMode=all 时不传 stopAt', async () => {
    const getListAll = vi.fn().mockResolvedValue([])
    const svc = { getListAll } as unknown as QsoService
    logsStore.setState({ syncMode: 'all' })
    await logsStore.getState().load(svc)
    const opts = getListAll.mock.calls[0]?.[0] as { stopAt?: unknown } | undefined
    expect(opts?.stopAt).toBeUndefined()
  })

  it('syncMode=today 时传入按 timestamp early-break 的 stopAt', async () => {
    const getListAll = vi.fn().mockResolvedValue([])
    const svc = { getListAll } as unknown as QsoService
    logsStore.setState({ syncMode: 'today' })
    await logsStore.getState().load(svc)
    const opts = getListAll.mock.calls[0]?.[0] as
      | { stopAt?: (r: QsoSummary) => boolean }
      | undefined
    expect(typeof opts?.stopAt).toBe('function')
    // 昨天的记录触发停止
    expect(opts!.stopAt!(makeSummary({ timestamp: 1000 }))).toBe(true)
    // 今天的记录不停止（用远未来时间戳）
    const future = Math.floor(Date.now() / 1000) + 1000
    expect(opts!.stopAt!(makeSummary({ timestamp: future }))).toBe(false)
  })

  it('load 重置 page 到 0', async () => {
    const svc = mockSvc([])
    logsStore.setState({ page: 5 })
    await logsStore.getState().load(svc)
    expect(logsStore.getState().page).toBe(0)
  })

  it('syncMode=incremental 首次加载（existing 空）等同 all', async () => {
    const getListAll = vi.fn().mockResolvedValue([makeSummary({ logId: 1 })])
    const svc = { getListAll } as unknown as QsoService
    logsStore.setState({ syncMode: 'incremental', all: [] })
    await logsStore.getState().load(svc)
    const opts = getListAll.mock.calls[0]?.[0] as { stopAt?: unknown } | undefined
    expect(opts?.stopAt).toBeUndefined()
    expect(logsStore.getState().all).toHaveLength(1)
  })

  it('syncMode=incremental 有 existing 时 stopAt 按最大 logId 边界', async () => {
    const existing = [makeSummary({ logId: 100 }), makeSummary({ logId: 99 })]
    const getListAll = vi.fn().mockResolvedValue([])
    const svc = { getListAll } as unknown as QsoService
    logsStore.setState({ syncMode: 'incremental', all: existing })
    await logsStore.getState().load(svc)

    const opts = getListAll.mock.calls[0]?.[0] as
      | { stopAt?: (r: QsoSummary) => boolean }
      | undefined
    expect(typeof opts?.stopAt).toBe('function')
    expect(opts!.stopAt!(makeSummary({ logId: 101 }))).toBe(false) // 新记录继续
    expect(opts!.stopAt!(makeSummary({ logId: 100 }))).toBe(true) // 命中边界停
    expect(opts!.stopAt!(makeSummary({ logId: 50 }))).toBe(true) // 更旧也停
  })

  it('syncMode=incremental 把拉回来的 fresh 记录 prepend 到 existing', async () => {
    const existing = [makeSummary({ logId: 100 }), makeSummary({ logId: 99 })]
    const fresh = [makeSummary({ logId: 102 }), makeSummary({ logId: 101 })]
    const getListAll = vi.fn().mockResolvedValue(fresh)
    const svc = { getListAll } as unknown as QsoService
    logsStore.setState({ syncMode: 'incremental', all: existing })
    await logsStore.getState().load(svc)
    expect(logsStore.getState().all.map((r) => r.logId)).toEqual([102, 101, 100, 99])
  })

  it('syncMode=incremental 无新记录时保留 existing 不变', async () => {
    const existing = [makeSummary({ logId: 100 })]
    const getListAll = vi.fn().mockResolvedValue([])
    const svc = { getListAll } as unknown as QsoService
    logsStore.setState({ syncMode: 'incremental', all: existing })
    await logsStore.getState().load(svc)
    expect(logsStore.getState().all).toHaveLength(1)
    expect(logsStore.getState().all[0]?.logId).toBe(100)
  })
})

describe('logs store · loadNew', () => {
  it('按已有最大 logId 边界拉新增，并入后倒序在前', async () => {
    const existing = [
      makeSummary({ logId: 100, timestamp: 2000 }),
      makeSummary({ logId: 99, timestamp: 1000 })
    ]
    logsStore.setState({ all: existing })
    const getListAll = vi.fn(({ stopAt }: { stopAt: (r: QsoSummary) => boolean }) => {
      // 模拟服务器倒序翻页 + stopAt early-break（同 QsoService.getListAll 语义）
      const serverList = [
        makeSummary({ logId: 102, timestamp: 4000 }),
        makeSummary({ logId: 101, timestamp: 3000 }),
        makeSummary({ logId: 100, timestamp: 2000 })
      ]
      const out: QsoSummary[] = []
      for (const r of serverList) {
        if (stopAt(r)) break
        out.push(r)
      }
      return Promise.resolve(out)
    })
    const svc = { getListAll } as unknown as QsoService

    await logsStore.getState().loadNew(svc)

    expect(logsStore.getState().all.map((r) => r.logId)).toEqual([102, 101, 100, 99])
    // 不动 page/status
    expect(logsStore.getState().page).toBe(0)
    expect(logsStore.getState().status).toBe('idle')
  })

  it('无新记录时 all 引用不变', async () => {
    const existing = [makeSummary({ logId: 100 })]
    logsStore.setState({ all: existing })
    const svc = { getListAll: vi.fn().mockResolvedValue([]) } as unknown as QsoService

    await logsStore.getState().loadNew(svc)

    expect(logsStore.getState().all).toBe(existing)
  })

  it('svc 抛错时静默：state 不变、不置 error', async () => {
    const existing = [makeSummary({ logId: 100 })]
    logsStore.setState({ all: existing })
    const svc = { getListAll: vi.fn().mockRejectedValue(new Error('boom')) } as unknown as QsoService

    await expect(logsStore.getState().loadNew(svc)).resolves.toBeUndefined()

    expect(logsStore.getState().all).toBe(existing)
    expect(logsStore.getState().status).toBe('idle')
    expect(logsStore.getState().error).toBeNull()
  })

  it('status=loading 时跳过（不与全量 load 竞争）', async () => {
    const getListAll = vi.fn().mockResolvedValue([makeSummary({ logId: 1 })])
    const svc = { getListAll } as unknown as QsoService
    logsStore.setState({ status: 'loading' })

    await logsStore.getState().loadNew(svc)

    expect(getListAll).not.toHaveBeenCalled()
  })

  it('并发竞态去重：svc 返回一新一重复，重复 logId 不被二次并入', async () => {
    const existing = [makeSummary({ logId: 100, timestamp: 2000 })]
    logsStore.setState({ all: existing })
    // svc 返回 [102(新), 100(重复)]
    const svc = {
      getListAll: vi.fn().mockResolvedValue([
        makeSummary({ logId: 102, timestamp: 4000 }),
        makeSummary({ logId: 100, timestamp: 2000 })
      ])
    } as unknown as QsoService

    await logsStore.getState().loadNew(svc)

    const ids = logsStore.getState().all.map((r) => r.logId)
    expect(ids).toEqual([102, 100])
    // 100 只出现一次
    expect(ids.filter((id) => id === 100)).toHaveLength(1)
  })
})

describe('logs store · filter/page', () => {
  it('setFilter 重置 page', () => {
    logsStore.setState({ page: 3 })
    logsStore.getState().setFilter('BG')
    expect(logsStore.getState().page).toBe(0)
    expect(logsStore.getState().filter).toBe('BG')
  })

  it('setPage 不允许负数', () => {
    logsStore.getState().setPage(-5)
    expect(logsStore.getState().page).toBe(0)
  })
})

describe('selectors', () => {
  it('selectFiltered · 按呼号前缀大小写无关匹配', () => {
    logsStore.setState({
      all: [
        makeSummary({ toCallsign: 'BG1ABC' }),
        makeSummary({ toCallsign: 'BG2XYZ' }),
        makeSummary({ toCallsign: 'BY4SDL' })
      ],
      filter: 'bg'
    })
    expect(selectFiltered(logsStore.getState())).toHaveLength(2)
  })

  it('selectFiltered · 空 filter 返回全部', () => {
    logsStore.setState({
      all: [makeSummary(), makeSummary()],
      filter: ''
    })
    expect(selectFiltered(logsStore.getState())).toHaveLength(2)
  })

  it('selectPageSlice · 按 page + pageSize 切片', () => {
    // timestamp 递增 → 合并后按 timestamp 倒序 → logId 24 最先
    logsStore.setState({
      all: Array.from({ length: 25 }, (_, i) => makeSummary({ logId: i, timestamp: 1000 + i })),
      pageSize: 10,
      page: 1
    })
    const slice = selectPageSlice(logsStore.getState())
    expect(slice).toHaveLength(10)
    const first = slice[0]
    expect(first?.source).toBe('server')
    if (first?.source === 'server') expect(first.logId).toBe(14)
  })

  it('selectTotalPages · 非空时向上取整', () => {
    logsStore.setState({
      all: Array.from({ length: 25 }, (_, i) => makeSummary({ logId: i })),
      pageSize: 10
    })
    expect(selectTotalPages(logsStore.getState())).toBe(3)
  })

  it('selectTotalPages · 空列表返回 1（UI 不显示 0/0）', () => {
    expect(selectTotalPages(logsStore.getState())).toBe(1)
  })
})

describe('syncMode', () => {
  it('默认 syncMode 为 all', () => {
    expect(logsStore.getState().syncMode).toBe('all')
  })

  it('setSyncMode 切换并重置 page 到 0', () => {
    logsStore.setState({ page: 5 })
    logsStore.getState().setSyncMode('today')
    expect(logsStore.getState().syncMode).toBe('today')
    expect(logsStore.getState().page).toBe(0)
  })

  it('setSyncMode 相同值不触发 page 重置', () => {
    logsStore.setState({ page: 3, syncMode: 'today' })
    logsStore.getState().setSyncMode('today')
    expect(logsStore.getState().page).toBe(3)
  })

  it('selectSyncedAll · all 模式返回全部', () => {
    logsStore.setState({
      all: [makeSummary({ logId: 1 }), makeSummary({ logId: 2 })],
      syncMode: 'all'
    })
    expect(selectSyncedAll(logsStore.getState())).toHaveLength(2)
  })

  it('selectSyncedAll · today 模式筛掉昨天及更早', () => {
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayStartSec = Math.floor(todayStart.getTime() / 1000)

    logsStore.setState({
      all: [
        makeSummary({ logId: 1, timestamp: todayStartSec - 3600 }), // 昨天 23:00
        makeSummary({ logId: 2, timestamp: todayStartSec }), // 今天 00:00
        makeSummary({ logId: 3, timestamp: todayStartSec + 3600 }) // 今天 01:00
      ],
      syncMode: 'today'
    })
    const synced = selectSyncedAll(logsStore.getState())
    expect(synced).toHaveLength(2)
    expect(synced.map((r) => r.logId).sort()).toEqual([2, 3])
  })

  it('selectFiltered 基于 syncedAll（today + text 组合）', () => {
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayStartSec = Math.floor(todayStart.getTime() / 1000)

    logsStore.setState({
      all: [
        makeSummary({ logId: 1, toCallsign: 'BG1', timestamp: todayStartSec - 100 }),
        makeSummary({ logId: 2, toCallsign: 'BG2', timestamp: todayStartSec + 100 }),
        makeSummary({ logId: 3, toCallsign: 'BY3', timestamp: todayStartSec + 200 })
      ],
      syncMode: 'today',
      filter: 'BG'
    })
    const res = selectFiltered(logsStore.getState())
    expect(res).toHaveLength(1)
    const first = res[0]
    expect(first?.source).toBe('server')
    if (first?.source === 'server') expect(first.logId).toBe(2)
  })
})

describe('selectTodaysStats', () => {
  beforeEach(() => resetLogsForTest())

  it('统计今日去重人数与 QSO 数（合并 server+local，跨界过滤）', () => {
    const now = Math.floor(Date.now() / 1000)
    const yesterday = now - 86400
    logsStore.setState({
      all: [
        { logId: 1, timestamp: now, toCallsign: 'BG5HXX', grid: 'OM89' },
        { logId: 2, timestamp: now - 10, toCallsign: 'BG5HXX', grid: 'OM89' },
        { logId: 3, timestamp: yesterday, toCallsign: 'BD4ABC', grid: '' }
      ],
      local: [{ id: 'l1', timestamp: now - 20, toCallsign: 'BA0XYZ', grid: '', fields: {} }]
    })
    const { people, qsos } = selectTodaysStats(logsStore.getState())
    expect(people).toBe(2)
    expect(qsos).toBe(3)
  })

  it('server 与 local 同一条 (呼号,时间戳) 去重，只计一次', () => {
    const now = Math.floor(Date.now() / 1000)
    logsStore.setState({
      all: [{ logId: 1, timestamp: now, toCallsign: 'BG5HXX', grid: 'OM89' }],
      local: [{ id: 'l1', timestamp: now, toCallsign: 'BG5HXX', grid: 'OM89', fields: {} }]
    })
    expect(selectTodaysStats(logsStore.getState()).qsos).toBe(1)
  })
})
