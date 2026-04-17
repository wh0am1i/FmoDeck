import { describe, expect, it, vi } from 'vitest'
import { QsoService } from './client'
import type { FmoApiClient } from '@/lib/fmo-api/client'

function mockClient(): FmoApiClient {
  return {
    send: vi.fn(),
    onPush: vi.fn()
  } as unknown as FmoApiClient
}

describe('QsoService', () => {
  it('getList 返回摘要数组', async () => {
    const api = mockClient()
    vi.mocked(api.send).mockResolvedValue({
      type: 'qso',
      subType: 'getListResponse',
      code: 0,
      data: {
        list: [{ logId: 1, timestamp: 1776358502, toCallsign: 'BI2RCY', grid: 'PN11rr' }]
      }
    })
    const svc = new QsoService(api)
    const list = await svc.getList()
    expect(list).toEqual([
      { logId: 1, timestamp: 1776358502, toCallsign: 'BI2RCY', grid: 'PN11rr' }
    ])
    expect(api.send).toHaveBeenCalledWith({ type: 'qso', subType: 'getList' })
  })

  it('getList 空响应返回空数组', async () => {
    const api = mockClient()
    vi.mocked(api.send).mockResolvedValue({
      type: 'qso',
      subType: 'getListResponse',
      code: 0,
      data: {}
    })
    expect(await new QsoService(api).getList()).toEqual([])
  })

  it('getList 非 0 code 抛错', async () => {
    const api = mockClient()
    vi.mocked(api.send).mockResolvedValue({
      type: 'qso',
      subType: 'getListResponse',
      code: 1,
      data: null
    })
    await expect(new QsoService(api).getList()).rejects.toThrow(/code=1/)
  })

  it('getDetail 解包 data.log', async () => {
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
    expect(api.send).toHaveBeenCalledWith({
      type: 'qso',
      subType: 'getDetail',
      data: { logId: 173 }
    })
  })
})
