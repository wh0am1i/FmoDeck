import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  logsStore,
  resetLogsForTest,
  selectFiltered,
  selectPageSlice,
  selectTotalPages
} from './store'
import type { QsoService } from '@/lib/qso-service/client'
import type { QsoSummary } from '@/types/qso'

function mockSvc(list: QsoSummary[]): QsoService {
  return { getList: vi.fn().mockResolvedValue(list) } as unknown as QsoService
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
      getList: vi.fn().mockRejectedValue(new Error('boom'))
    } as unknown as QsoService
    await logsStore.getState().load(svc)
    expect(logsStore.getState().status).toBe('error')
    expect(logsStore.getState().error?.message).toBe('boom')
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
