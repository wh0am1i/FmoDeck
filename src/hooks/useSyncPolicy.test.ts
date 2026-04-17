import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useSyncPolicy } from './useSyncPolicy'
import { logsStore, resetLogsForTest } from '@/features/logs/store'
import { resetSettingsForTest, settingsStore } from '@/stores/settings'

beforeEach(() => {
  resetSettingsForTest()
  resetLogsForTest()
  localStorage.clear()
})

afterEach(() => {
  resetSettingsForTest()
  resetLogsForTest()
})

describe('useSyncPolicy', () => {
  it('挂载时从激活地址读 syncMode 同步到 logsStore', () => {
    settingsStore.setState({
      fmoAddresses: [{ id: 'a', host: 'fmo.local', syncMode: 'today' }],
      activeAddressId: 'a'
    })
    renderHook(() => useSyncPolicy())
    expect(logsStore.getState().syncMode).toBe('today')
  })

  it('无激活地址时默认 all', () => {
    renderHook(() => useSyncPolicy())
    expect(logsStore.getState().syncMode).toBe('all')
  })

  it('切换激活地址时自动同步', () => {
    settingsStore.setState({
      fmoAddresses: [
        { id: 'a', host: 'a.local', syncMode: 'today' },
        { id: 'b', host: 'b.local', syncMode: 'all' }
      ],
      activeAddressId: 'a'
    })
    renderHook(() => useSyncPolicy())
    expect(logsStore.getState().syncMode).toBe('today')

    settingsStore.setState({ activeAddressId: 'b' })
    expect(logsStore.getState().syncMode).toBe('all')
  })

  it('修改当前激活地址的 syncMode 时同步', () => {
    settingsStore.setState({
      fmoAddresses: [{ id: 'a', host: 'a.local', syncMode: 'all' }],
      activeAddressId: 'a'
    })
    renderHook(() => useSyncPolicy())
    expect(logsStore.getState().syncMode).toBe('all')

    settingsStore.getState().updateAddress('a', { syncMode: 'today' })
    expect(logsStore.getState().syncMode).toBe('today')
  })
})
