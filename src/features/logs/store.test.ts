import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  logsStore,
  resetLogsForTest,
  selectFiltered,
  selectPageSlice,
  selectSyncedAll,
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
    logsStore.setState({
      all: Array.from({ length: 25 }, (_, i) => makeSummary({ logId: i })),
      pageSize: 10,
      page: 1
    })
    const slice = selectPageSlice(logsStore.getState())
    expect(slice).toHaveLength(10)
    expect(slice[0]?.logId).toBe(10)
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
    expect(res[0]?.logId).toBe(2)
  })
})
