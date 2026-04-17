import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useFmoSync } from './useFmoSync'
import { resetSettingsForTest, settingsStore } from '@/stores/settings'
import { connectionStore, resetConnectionForTest } from '@/stores/connection'

const connectMock = vi.fn<(url: string) => Promise<void>>()
const disconnectMock = vi.fn<() => void>()

beforeEach(() => {
  connectMock.mockReset().mockResolvedValue()
  disconnectMock.mockReset()
  // 覆写 store 的 actions
  connectionStore.setState({
    connect: connectMock,
    disconnect: disconnectMock
  })
})

afterEach(() => {
  resetSettingsForTest()
  resetConnectionForTest()
  localStorage.clear()
})

describe('useFmoSync', () => {
  it('无激活地址时调用 disconnect', () => {
    renderHook(() => useFmoSync())
    expect(connectMock).not.toHaveBeenCalled()
    expect(disconnectMock).toHaveBeenCalled()
  })

  it('有激活地址时按 protocol+host 拼出 ws URL 并 connect', () => {
    settingsStore.setState({
      fmoAddresses: [{ id: 'a', host: 'fmo.local' }],
      activeAddressId: 'a',
      protocol: 'ws'
    })
    renderHook(() => useFmoSync())
    expect(connectMock).toHaveBeenCalledWith('ws://fmo.local/ws')
  })

  it('protocol=wss 时拼出 wss URL', () => {
    settingsStore.setState({
      fmoAddresses: [{ id: 'a', host: 'fmo.local' }],
      activeAddressId: 'a',
      protocol: 'wss'
    })
    renderHook(() => useFmoSync())
    expect(connectMock).toHaveBeenCalledWith('wss://fmo.local/ws')
  })

  it('normalizeHost 自动去协议前缀和尾斜杠', () => {
    settingsStore.setState({
      fmoAddresses: [{ id: 'a', host: 'https://fmo.local/' }],
      activeAddressId: 'a',
      protocol: 'ws'
    })
    renderHook(() => useFmoSync())
    expect(connectMock).toHaveBeenCalledWith('ws://fmo.local/ws')
  })

  it('切换 activeAddressId 后自动重连新地址', () => {
    settingsStore.setState({
      fmoAddresses: [
        { id: 'a', host: 'a.local' },
        { id: 'b', host: 'b.local' }
      ],
      activeAddressId: 'a',
      protocol: 'ws'
    })
    renderHook(() => useFmoSync())
    expect(connectMock).toHaveBeenLastCalledWith('ws://a.local/ws')

    settingsStore.setState({ activeAddressId: 'b' })
    expect(connectMock).toHaveBeenLastCalledWith('ws://b.local/ws')
  })

  it('组件卸载时断开连接', () => {
    settingsStore.setState({
      fmoAddresses: [{ id: 'a', host: 'fmo.local' }],
      activeAddressId: 'a'
    })
    const { unmount } = renderHook(() => useFmoSync())
    disconnectMock.mockClear()
    unmount()
    expect(disconnectMock).toHaveBeenCalled()
  })
})
