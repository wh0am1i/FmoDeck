import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  messagesStore,
  resetMessagesForTest,
  selectUnreadCount
} from './store'
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
