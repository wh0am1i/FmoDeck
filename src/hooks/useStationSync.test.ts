import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useStationSync } from './useStationSync'
import { logsStore, resetLogsForTest } from '@/features/logs/store'
import { stationStore } from '@/features/station/store'
import { connectionStore, resetConnectionForTest } from '@/stores/connection'

beforeEach(() => {
  resetLogsForTest()
  resetConnectionForTest()
  stationStore.setState({ current: null, list: [], status: 'idle', error: null })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('useStationSync', () => {
  it('初次从 null 设置 current 不触发 logs.load', () => {
    const load = vi.fn()
    logsStore.setState({ load })
    connectionStore.setState({
      status: 'connected',
      client: { disconnect: () => undefined } as never
    })
    renderHook(() => useStationSync())
    stationStore.setState({ current: { uid: 1, name: 'A' } })
    expect(load).not.toHaveBeenCalled()
  })

  it('切换 station 触发 logs.load 并清空 all', () => {
    const load = vi.fn<() => Promise<void>>().mockResolvedValue()
    logsStore.setState({
      load,
      all: [
        {
          logId: 1,
          timestamp: 1000,
          toCallsign: 'X',
          grid: 'XX'
        }
      ]
    })
    connectionStore.setState({
      status: 'connected',
      client: { disconnect: () => undefined } as never
    })
    // 初始化到 station A
    stationStore.setState({ current: { uid: 1, name: 'A' } })

    renderHook(() => useStationSync())

    // 切换到 station B
    stationStore.setState({ current: { uid: 2, name: 'B' } })

    expect(load).toHaveBeenCalledTimes(1)
    expect(logsStore.getState().all).toEqual([])
    expect(logsStore.getState().page).toBe(0)
  })

  it('相同 uid 不触发', () => {
    const load = vi.fn()
    logsStore.setState({ load })
    connectionStore.setState({
      status: 'connected',
      client: { disconnect: () => undefined } as never
    })
    stationStore.setState({ current: { uid: 1, name: 'A' } })
    renderHook(() => useStationSync())
    stationStore.setState({ current: { uid: 1, name: 'A' } })
    expect(load).not.toHaveBeenCalled()
  })

  it('没有 connection.client 时不触发', () => {
    const load = vi.fn()
    logsStore.setState({ load })
    stationStore.setState({ current: { uid: 1, name: 'A' } })
    renderHook(() => useStationSync())
    stationStore.setState({ current: { uid: 2, name: 'B' } })
    expect(load).not.toHaveBeenCalled()
  })
})
