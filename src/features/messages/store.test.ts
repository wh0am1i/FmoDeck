import { afterEach, describe, expect, it, vi } from 'vitest'
import { messagesStore, resetMessagesForTest, selectHasMore, selectUnreadCount } from './store'
import type { MessageService } from '@/lib/message-service/client'
import type { MessagePage, MessageSummary } from '@/types/message'

function makeSummary(overrides: Partial<MessageSummary> = {}): MessageSummary {
  return {
    messageId: 'm-1',
    from: 'BA0AX',
    timestamp: 1000,
    isRead: false,
    ...overrides
  }
}

function mockSvc(page: MessagePage): MessageService {
  return { getList: vi.fn().mockResolvedValue(page) } as unknown as MessageService
}

function pageOf(list: MessageSummary[]): MessagePage {
  return { list, anchorId: 0, nextAnchorId: 0, page: 0, pageSize: 20, count: list.length }
}

afterEach(() => {
  resetMessagesForTest()
})

describe('messages store · load', () => {
  it('load 后填充 list 并 status=idle', async () => {
    const svc = mockSvc(pageOf([makeSummary({ messageId: 'a' })]))
    await messagesStore.getState().load(svc)
    expect(messagesStore.getState().list).toHaveLength(1)
    expect(messagesStore.getState().status).toBe('idle')
  })

  it('load 失败时 status=error + 保存 error', async () => {
    const svc = {
      getList: vi.fn().mockRejectedValue(new Error('boom'))
    } as unknown as MessageService
    await messagesStore.getState().load(svc)
    expect(messagesStore.getState().status).toBe('error')
    expect(messagesStore.getState().error?.message).toBe('boom')
  })
})

describe('messages store · prependSummary', () => {
  it('新消息 prepend 到最前', () => {
    messagesStore.setState({ list: [makeSummary({ messageId: 'old' })] })
    messagesStore.getState().prependSummary(makeSummary({ messageId: 'new' }))
    expect(messagesStore.getState().list.map((m) => m.messageId)).toEqual(['new', 'old'])
  })

  it('同 messageId 不重复插入', () => {
    messagesStore.setState({ list: [makeSummary({ messageId: 'a' })] })
    messagesStore.getState().prependSummary(makeSummary({ messageId: 'a' }))
    expect(messagesStore.getState().list).toHaveLength(1)
  })
})

describe('messages store · markRead', () => {
  it('按 id 设为已读', () => {
    messagesStore.setState({
      list: [makeSummary({ messageId: 'a', isRead: false })]
    })
    messagesStore.getState().markRead('a')
    expect(messagesStore.getState().list[0]?.isRead).toBe(true)
  })

  it('未命中 id 不报错', () => {
    messagesStore.setState({ list: [makeSummary({ messageId: 'a' })] })
    expect(() => messagesStore.getState().markRead('nope')).not.toThrow()
  })
})

describe('selectUnreadCount', () => {
  it('统计未读条数', () => {
    messagesStore.setState({
      list: [
        makeSummary({ messageId: 'a', isRead: false }),
        makeSummary({ messageId: 'b', isRead: true }),
        makeSummary({ messageId: 'c', isRead: false })
      ]
    })
    expect(selectUnreadCount(messagesStore.getState())).toBe(2)
  })
})

describe('messages store · 分页', () => {
  function pageWithNext(list: MessageSummary[], nextAnchorId: number): MessagePage {
    return { list, anchorId: 0, nextAnchorId, page: 0, pageSize: 20, count: list.length }
  }

  it('load 填充 nextAnchorId', async () => {
    const svc = mockSvc(pageWithNext([makeSummary({ messageId: 'a' })], 42))
    await messagesStore.getState().load(svc)
    expect(messagesStore.getState().nextAnchorId).toBe(42)
  })

  it('selectHasMore · nextAnchorId>0 时 true', () => {
    messagesStore.setState({ nextAnchorId: 42 })
    expect(selectHasMore(messagesStore.getState())).toBe(true)
  })

  it('selectHasMore · nextAnchorId=0 时 false', () => {
    messagesStore.setState({ nextAnchorId: 0 })
    expect(selectHasMore(messagesStore.getState())).toBe(false)
  })

  it('selectHasMore · nextAnchorId=null 时 false（未加载）', () => {
    messagesStore.setState({ nextAnchorId: null })
    expect(selectHasMore(messagesStore.getState())).toBe(false)
  })

  it('loadMore · 未加载过则不发请求', async () => {
    const getList = vi.fn()
    const svc = { getList } as unknown as MessageService
    messagesStore.setState({ nextAnchorId: null })
    await messagesStore.getState().loadMore(svc)
    expect(getList).not.toHaveBeenCalled()
  })

  it('loadMore · 已到末尾（0）不发请求', async () => {
    const getList = vi.fn()
    const svc = { getList } as unknown as MessageService
    messagesStore.setState({ nextAnchorId: 0 })
    await messagesStore.getState().loadMore(svc)
    expect(getList).not.toHaveBeenCalled()
  })

  it('loadMore · 用 nextAnchorId 请求下一页并 append', async () => {
    messagesStore.setState({
      list: [makeSummary({ messageId: 'a' })],
      nextAnchorId: 42
    })
    const getList = vi.fn().mockResolvedValue(pageWithNext([makeSummary({ messageId: 'b' })], 100))
    const svc = { getList } as unknown as MessageService
    await messagesStore.getState().loadMore(svc)
    expect(getList).toHaveBeenCalledWith({ anchorId: 42 })
    expect(messagesStore.getState().list.map((m) => m.messageId)).toEqual(['a', 'b'])
    expect(messagesStore.getState().nextAnchorId).toBe(100)
  })

  it('loadMore · 重叠消息去重', async () => {
    messagesStore.setState({
      list: [makeSummary({ messageId: 'a' }), makeSummary({ messageId: 'b' })],
      nextAnchorId: 42
    })
    const getList = vi.fn().mockResolvedValue(
      pageWithNext(
        [
          makeSummary({ messageId: 'b' }), // 重叠
          makeSummary({ messageId: 'c' })
        ],
        0
      )
    )
    const svc = { getList } as unknown as MessageService
    await messagesStore.getState().loadMore(svc)
    expect(messagesStore.getState().list.map((m) => m.messageId)).toEqual(['a', 'b', 'c'])
  })
})
