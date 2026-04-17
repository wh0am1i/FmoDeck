import { describe, expect, it, vi } from 'vitest'
import { MessageService } from './client'
import type { FmoApiClient } from '@/lib/fmo-api/client'

function mockClient(): FmoApiClient {
  return {
    send: vi.fn(),
    onPush: vi.fn()
  } as unknown as FmoApiClient
}

describe('MessageService', () => {
  it('getList 返回分页响应对象', async () => {
    const api = mockClient()
    vi.mocked(api.send).mockResolvedValue({
      type: 'message',
      subType: 'getListResponse',
      code: 0,
      data: {
        list: [{ messageId: '1', from: 'BA0AX', timestamp: 1000, isRead: false }],
        anchorId: 0,
        nextAnchorId: 1,
        page: 0,
        pageSize: 20,
        count: 1
      }
    })
    const svc = new MessageService(api)
    const page = await svc.getList({ pageSize: 20 })
    expect(page.list).toHaveLength(1)
    expect(page.nextAnchorId).toBe(1)
    expect(api.send).toHaveBeenCalledWith({
      type: 'message',
      subType: 'getList',
      data: { pageSize: 20 }
    })
  })

  it('非 0 code 抛错', async () => {
    const api = mockClient()
    vi.mocked(api.send).mockResolvedValue({
      type: 'message',
      subType: 'getListResponse',
      code: 1,
      data: null
    })
    const svc = new MessageService(api)
    await expect(svc.getList()).rejects.toThrow(/code=1/)
  })

  it('getDetail 自动解包 data.message', async () => {
    const api = mockClient()
    vi.mocked(api.send).mockResolvedValue({
      type: 'message',
      subType: 'getDetailResponse',
      code: 0,
      data: {
        message: {
          messageId: 'x',
          from: 'BA0AX',
          timestamp: 1,
          isRead: true,
          content: '嗨'
        }
      }
    })
    const svc = new MessageService(api)
    const detail = await svc.getDetail('x')
    expect(detail.content).toBe('嗨')
  })

  it('onSummary 只转发 message/summary 推送', () => {
    let registered: ((msg: unknown) => void) | null = null
    const api = mockClient()
    vi.mocked(api.onPush).mockImplementation((cb) => {
      registered = cb as (msg: unknown) => void
      return () => undefined
    })

    const svc = new MessageService(api)
    const received: unknown[] = []
    svc.onSummary((s) => received.push(s))

    registered!({ type: 'message', subType: 'summary', code: 0, data: { messageId: 'a' } })
    registered!({ type: 'station', subType: 'setCurrent', code: 0, data: {} })
    expect(received).toEqual([{ messageId: 'a' }])
  })
})
