import { describe, expect, it, vi } from 'vitest'
import { ConfigService } from './client'
import type { FmoApiClient } from '@/lib/fmo-api/client'

function fakeApi(resp: unknown): FmoApiClient {
  return { send: vi.fn().mockResolvedValue(resp) } as unknown as FmoApiClient
}

describe('ConfigService.getCoordinate', () => {
  it('正常坐标 → LatLng', async () => {
    const svc = new ConfigService(
      fakeApi({
        type: 'config',
        subType: 'getCordinateResponse',
        code: 0,
        data: { latitude: 31.23, longitude: 121.47 }
      })
    )
    expect(await svc.getCoordinate()).toEqual({ lat: 31.23, lng: 121.47 })
  })
  it('code≠0 → null', async () => {
    const svc = new ConfigService(
      fakeApi({ type: 'config', subType: 'getCordinateResponse', code: -1, data: {} })
    )
    expect(await svc.getCoordinate()).toBeNull()
  })
  it('全 0 坐标（设备未设）→ null', async () => {
    const svc = new ConfigService(
      fakeApi({
        type: 'config',
        subType: 'getCordinateResponse',
        code: 0,
        data: { latitude: 0, longitude: 0 }
      })
    )
    expect(await svc.getCoordinate()).toBeNull()
  })
  it('越界坐标 → null', async () => {
    const svc = new ConfigService(
      fakeApi({
        type: 'config',
        subType: 'getCordinateResponse',
        code: 0,
        data: { latitude: 999, longitude: 121 }
      })
    )
    expect(await svc.getCoordinate()).toBeNull()
  })
  it('字段非数字 → null', async () => {
    const svc = new ConfigService(
      fakeApi({
        type: 'config',
        subType: 'getCordinateResponse',
        code: 0,
        data: { latitude: 'x', longitude: null }
      })
    )
    expect(await svc.getCoordinate()).toBeNull()
  })
})
