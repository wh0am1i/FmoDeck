import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useLogsSync } from './useLogsSync'
import { connectionStore, resetConnectionForTest } from '@/stores/connection'
import { logsStore, resetLogsForTest } from '@/features/logs/store'
import type { FmoApiClient } from '@/lib/fmo-api/client'

function fakeClient(list: unknown[]): FmoApiClient {
  return {
    send: vi.fn().mockResolvedValue({
      type: 'qso',
      subType: 'getListResponse',
      code: 0,
      data: { list }
    })
  } as unknown as FmoApiClient
}

beforeEach(() => {
  resetConnectionForTest()
  resetLogsForTest()
})
afterEach(() => {
  resetConnectionForTest()
  resetLogsForTest()
})

describe('useLogsSync', () => {
  it('连接已建立时挂载即拉取服务器日志到 logsStore.all', async () => {
    const now = Math.floor(Date.now() / 1000)
    const client = fakeClient([
      { logId: 2, timestamp: now, toCallsign: 'BG5HXX', grid: 'OM89' },
      { logId: 1, timestamp: now - 100, toCallsign: 'BA0XYZ', grid: '' }
    ])
    connectionStore.setState({ status: 'connected', client })

    renderHook(() => useLogsSync())

    await waitFor(() => expect(logsStore.getState().all.length).toBe(2))
  })

  it('未连接时不拉取', async () => {
    renderHook(() => useLogsSync())
    await Promise.resolve()
    expect(logsStore.getState().all.length).toBe(0)
  })

  it('logsStore 已有数据时不重复拉取', async () => {
    const now = Math.floor(Date.now() / 1000)
    logsStore.setState({
      all: [{ logId: 9, timestamp: now, toCallsign: 'EXIST', grid: '' }]
    })
    const client = fakeClient([{ logId: 1, timestamp: now, toCallsign: 'NEW', grid: '' }])
    connectionStore.setState({ status: 'connected', client })

    renderHook(() => useLogsSync())
    await Promise.resolve()
    await Promise.resolve()

    expect(logsStore.getState().all).toHaveLength(1)
    expect(logsStore.getState().all[0]?.toCallsign).toBe('EXIST')
  })
})
