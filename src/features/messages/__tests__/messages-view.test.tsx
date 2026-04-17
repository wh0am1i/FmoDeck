import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MessagesView } from '../messages-view'
import { messagesStore, resetMessagesForTest } from '../store'
import { connectionStore, resetConnectionForTest } from '@/stores/connection'

beforeEach(() => {
  resetMessagesForTest()
  resetConnectionForTest()
  localStorage.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('MessagesView · 未连接', () => {
  it('显示离线占位', () => {
    render(<MessagesView />)
    expect(screen.getByText(/OFFLINE/)).toBeInTheDocument()
  })
})

describe('MessagesView · 已连接', () => {
  beforeEach(() => {
    connectionStore.setState({
      status: 'connected',
      // 提供最小 stub：send 返回空分页避免 auto-load 污染状态
      client: {
        onPush: () => () => undefined,
        disconnect: () => undefined,
        send: () =>
          Promise.resolve({
            type: 'message',
            subType: 'getListResponse',
            code: 0,
            data: { list: [], anchorId: 0, nextAnchorId: 0, page: 0, pageSize: 20, count: 0 }
          })
      } as never
    })
  })

  it('空消息时显示 NO MESSAGES', () => {
    render(<MessagesView />)
    expect(screen.getByText(/NO MESSAGES/)).toBeInTheDocument()
  })

  it('有消息时显示列表 + 未读计数', () => {
    messagesStore.setState({
      list: [
        { messageId: 'a', from: 'BA0AX', timestamp: 1776358502, isRead: false },
        { messageId: 'b', from: 'BY4SDL', timestamp: 1776358000, isRead: true }
      ]
    })
    render(<MessagesView />)
    expect(screen.getByText(/1 未读 \/ 2/)).toBeInTheDocument()
    expect(screen.getByText('BA0AX')).toBeInTheDocument()
    expect(screen.getByText('BY4SDL')).toBeInTheDocument()
  })

  it('load 失败时显示错误消息', async () => {
    // 覆写 client 让 send 拒绝
    connectionStore.setState({
      client: {
        onPush: () => () => undefined,
        disconnect: () => undefined,
        send: () => Promise.reject(new Error('boom'))
      } as never
    })
    render(<MessagesView />)
    expect(await screen.findByText(/加载失败/)).toBeInTheDocument()
  })
})
