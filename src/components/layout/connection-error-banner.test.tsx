import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConnectionErrorBanner } from './connection-error-banner'
import { connectionStore, resetConnectionForTest } from '@/stores/connection'

beforeEach(() => {
  resetConnectionForTest()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ConnectionErrorBanner', () => {
  it('status=idle/connecting/connected 时不渲染', () => {
    const { container } = render(<ConnectionErrorBanner />)
    expect(container.firstChild).toBeNull()
  })

  it('status=error 时渲染错误消息', () => {
    connectionStore.setState({
      status: 'error',
      lastError: new Error('Connection refused'),
      currentUrl: 'ws://fmo.local/ws'
    })
    render(<ConnectionErrorBanner />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText(/Connection refused/)).toBeInTheDocument()
  })

  it('currentUrl 存在时显示重试按钮，点击触发 connect', async () => {
    const connect = vi.fn<(url: string) => Promise<void>>().mockResolvedValue()
    connectionStore.setState({
      status: 'error',
      lastError: new Error('boom'),
      currentUrl: 'ws://fmo.local/ws',
      connect
    })
    const user = userEvent.setup()
    render(<ConnectionErrorBanner />)
    await user.click(screen.getByRole('button', { name: '重试连接' }))
    expect(connect).toHaveBeenCalledWith('ws://fmo.local/ws')
  })

  it('currentUrl 为空时不显示重试按钮', () => {
    connectionStore.setState({
      status: 'error',
      lastError: new Error('boom'),
      currentUrl: null
    })
    render(<ConnectionErrorBanner />)
    expect(screen.queryByRole('button', { name: '重试连接' })).not.toBeInTheDocument()
  })

  it('lastError 为 null 时降级为"未知错误"', () => {
    connectionStore.setState({
      status: 'error',
      lastError: null,
      currentUrl: 'ws://x/ws'
    })
    render(<ConnectionErrorBanner />)
    expect(screen.getByText(/未知错误/)).toBeInTheDocument()
  })
})
