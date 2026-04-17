import { describe, expect, it, vi } from 'vitest'
import { StationService } from './client'
import type { FmoApiClient } from '@/lib/fmo-api/client'

function mockClient(): FmoApiClient {
  return {
    send: vi.fn(),
    onPush: vi.fn()
  } as unknown as FmoApiClient
}

function mkRangeResp(list: { uid: number; name: string }[]) {
  return {
    type: 'station' as const,
    subType: 'getListResponse' as const,
    code: 0,
    data: { list, count: list.length }
  }
}

describe('StationService.getCurrent', () => {
  it('返回当前中继', async () => {
    const api = mockClient()
    vi.mocked(api.send).mockResolvedValue({
      type: 'station',
      subType: 'getCurrentResponse',
      code: 0,
      data: { uid: 3867322085, name: '如意甘肃' }
    })
    const curr = await new StationService(api).getCurrent()
    expect(curr).toEqual({ uid: 3867322085, name: '如意甘肃' })
  })

  it('非 0 code 抛错', async () => {
    const api = mockClient()
    vi.mocked(api.send).mockResolvedValue({
      type: 'station',
      subType: 'getCurrentResponse',
      code: 1,
      data: null
    })
    await expect(new StationService(api).getCurrent()).rejects.toThrow(/code=1/)
  })
})

describe('StationService.getListAll', () => {
  it('循环翻页直到短页停止', async () => {
    const api = mockClient()
    const page0 = Array.from({ length: 20 }, (_, i) => ({ uid: i, name: `S${i}` }))
    const page1 = [{ uid: 20, name: 'S20' }]
    vi.mocked(api.send)
      .mockResolvedValueOnce(mkRangeResp(page0))
      .mockResolvedValueOnce(mkRangeResp(page1))

    const list = await new StationService(api).getListAll()
    expect(list).toHaveLength(21)
    expect(api.send).toHaveBeenCalledTimes(2)
    expect(vi.mocked(api.send).mock.calls[0]?.[0]).toMatchObject({
      data: { start: 0, count: 20 }
    })
    expect(vi.mocked(api.send).mock.calls[1]?.[0]).toMatchObject({
      data: { start: 20, count: 20 }
    })
  })

  it('首页空时返回空数组', async () => {
    const api = mockClient()
    vi.mocked(api.send).mockResolvedValue(mkRangeResp([]))
    expect(await new StationService(api).getListAll()).toHaveLength(0)
    expect(api.send).toHaveBeenCalledTimes(1)
  })

  it('maxPages 上限', async () => {
    const api = mockClient()
    const full = Array.from({ length: 20 }, (_, i) => ({ uid: i, name: `S${i}` }))
    vi.mocked(api.send).mockResolvedValue(mkRangeResp(full))
    const list = await new StationService(api).getListAll({ maxPages: 2 })
    expect(list).toHaveLength(40)
    expect(api.send).toHaveBeenCalledTimes(2)
  })
})

describe('StationService · 切换动作', () => {
  it.each([
    ['setCurrent', { type: 'station', subType: 'setCurrent', data: { uid: 42 } }],
    ['next', { type: 'station', subType: 'next' }],
    ['prev', { type: 'station', subType: 'prev' }]
  ] as const)('%s 正确 send', async (method, expectedReq) => {
    const api = mockClient()
    vi.mocked(api.send).mockResolvedValue({
      type: 'station',
      subType: `${method}Response` as never,
      code: 0,
      data: null
    })
    const svc = new StationService(api)
    if (method === 'setCurrent') await svc.setCurrent(42)
    else if (method === 'next') await svc.next()
    else await svc.prev()
    expect(api.send).toHaveBeenCalledWith(expectedReq)
  })

  it('setCurrent 非 0 code 抛错', async () => {
    const api = mockClient()
    vi.mocked(api.send).mockResolvedValue({
      type: 'station',
      subType: 'setCurrentResponse',
      code: 1,
      data: null
    })
    await expect(new StationService(api).setCurrent(1)).rejects.toThrow(/code=1/)
  })
})
