import { describe, expect, it, vi } from 'vitest'
import { QsoService } from './client'
import type { FmoApiClient } from '@/lib/fmo-api/client'
import type { QsoSummary } from '@/types/qso'

function mockClient(): FmoApiClient {
  return {
    send: vi.fn(),
    onPush: vi.fn()
  } as unknown as FmoApiClient
}

function makeSummary(logId: number, timestamp: number): QsoSummary {
  return { logId, timestamp, toCallsign: `C${logId}`, grid: '' }
}

function pageResp(list: QsoSummary[], page: number) {
  return {
    type: 'qso' as const,
    subType: 'getListResponse' as const,
    code: 0,
    data: { list, page, pageSize: 20, count: list.length }
  }
}

describe('QsoService.getList · 单页', () => {
  it('默认不带 page 参数', async () => {
    const api = mockClient()
    vi.mocked(api.send).mockResolvedValue(pageResp([makeSummary(173, 1)], 0))
    const list = await new QsoService(api).getList()
    expect(list).toHaveLength(1)
    expect(api.send).toHaveBeenCalledWith({ type: 'qso', subType: 'getList' })
  })

  it('带 page 参数', async () => {
    const api = mockClient()
    vi.mocked(api.send).mockResolvedValue(pageResp([], 3))
    await new QsoService(api).getList({ page: 3 })
    expect(api.send).toHaveBeenCalledWith({
      type: 'qso',
      subType: 'getList',
      data: { page: 3 }
    })
  })

  it('非 0 code 抛错', async () => {
    const api = mockClient()
    vi.mocked(api.send).mockResolvedValue({
      type: 'qso',
      subType: 'getListResponse',
      code: 1,
      data: null
    })
    await expect(new QsoService(api).getList()).rejects.toThrow(/code=1/)
  })
})

describe('QsoService.getListAll · 循环翻页', () => {
  it('list.length < 20 时停止', async () => {
    const api = mockClient()
    // 第 0 页满 20，第 1 页 5 条
    const page0 = Array.from({ length: 20 }, (_, i) => makeSummary(100 - i, 1000 - i))
    const page1 = Array.from({ length: 5 }, (_, i) => makeSummary(80 - i, 900 - i))
    vi.mocked(api.send)
      .mockResolvedValueOnce(pageResp(page0, 0))
      .mockResolvedValueOnce(pageResp(page1, 1))

    const all = await new QsoService(api).getListAll()
    expect(all).toHaveLength(25)
    expect(api.send).toHaveBeenCalledTimes(2)
    // 第二次请求应带 page=1
    expect(vi.mocked(api.send).mock.calls[1]?.[0]).toMatchObject({
      type: 'qso',
      subType: 'getList',
      data: { page: 1 }
    })
  })

  it('空页时停止', async () => {
    const api = mockClient()
    const page0 = Array.from({ length: 20 }, (_, i) => makeSummary(100 - i, 1000 - i))
    vi.mocked(api.send)
      .mockResolvedValueOnce(pageResp(page0, 0))
      .mockResolvedValueOnce(pageResp([], 1))
    const all = await new QsoService(api).getListAll()
    expect(all).toHaveLength(20)
    expect(api.send).toHaveBeenCalledTimes(2)
  })

  it('首页空时直接返回空数组', async () => {
    const api = mockClient()
    vi.mocked(api.send).mockResolvedValueOnce(pageResp([], 0))
    const all = await new QsoService(api).getListAll()
    expect(all).toHaveLength(0)
    expect(api.send).toHaveBeenCalledTimes(1)
  })

  it('stopAt 匹配到时立即停止，不包含匹配项', async () => {
    const api = mockClient()
    // page0：timestamp 1000..981 (20 条)
    const page0 = Array.from({ length: 20 }, (_, i) => makeSummary(100 - i, 1000 - i))
    vi.mocked(api.send).mockResolvedValueOnce(pageResp(page0, 0))

    const all = await new QsoService(api).getListAll({
      stopAt: (r) => r.timestamp < 990
    })
    // 包含 1000..990（11 条）；遇到 989 即停
    expect(all).toHaveLength(11)
    expect(all[all.length - 1]?.timestamp).toBe(990)
    // 只发了 1 个请求（第一页已满但 stopAt 命中）
    expect(api.send).toHaveBeenCalledTimes(1)
  })

  it('stopAt 未命中时继续翻页', async () => {
    const api = mockClient()
    const page0 = Array.from({ length: 20 }, (_, i) => makeSummary(100 - i, 1000 - i))
    const page1 = Array.from({ length: 3 }, (_, i) => makeSummary(80 - i, 980 - i))
    vi.mocked(api.send)
      .mockResolvedValueOnce(pageResp(page0, 0))
      .mockResolvedValueOnce(pageResp(page1, 1))

    const all = await new QsoService(api).getListAll({
      stopAt: (r) => r.timestamp < 0 // never
    })
    expect(all).toHaveLength(23)
    expect(api.send).toHaveBeenCalledTimes(2)
  })

  it('maxPages 防御无限循环', async () => {
    const api = mockClient()
    // 每次返回满页，人为触发 maxPages 上限
    const full = Array.from({ length: 20 }, (_, i) => makeSummary(i, i))
    vi.mocked(api.send).mockResolvedValue(pageResp(full, 0))

    const all = await new QsoService(api).getListAll({ maxPages: 3 })
    expect(all).toHaveLength(60)
    expect(api.send).toHaveBeenCalledTimes(3)
  })
})

describe('QsoService.getDetail', () => {
  it('解包 data.log', async () => {
    const api = mockClient()
    vi.mocked(api.send).mockResolvedValue({
      type: 'qso',
      subType: 'getDetailResponse',
      code: 0,
      data: {
        log: {
          logId: 173,
          timestamp: 1776358502,
          freqHz: 1457500,
          fromCallsign: 'BH6SCA',
          fromGrid: 'OM40vp',
          toCallsign: 'BI2RCY',
          toGrid: 'PN11rr',
          toComment: 'ID:BI2RCY',
          mode: 'FMO',
          relayName: '如意甘肃',
          relayAdmin: 'BG9JYT'
        }
      }
    })
    const detail = await new QsoService(api).getDetail(173)
    expect(detail.logId).toBe(173)
    expect(detail.relayName).toBe('如意甘肃')
  })
})
