import { afterEach, describe, expect, it, vi } from 'vitest'
import { resetStationForTest, stationStore } from './store'
import type { ServerStation, StationService } from '@/lib/station-service/client'

function mockSvc(overrides: Partial<Record<keyof StationService, ReturnType<typeof vi.fn>>> = {}): StationService {
  return {
    getCurrent: vi.fn().mockResolvedValue({ uid: 1, name: 'A' } as ServerStation),
    getListAll: vi.fn().mockResolvedValue([{ uid: 1, name: 'A' }]),
    setCurrent: vi.fn().mockResolvedValue(undefined),
    next: vi.fn().mockResolvedValue(undefined),
    prev: vi.fn().mockResolvedValue(undefined),
    ...overrides
  } as unknown as StationService
}

afterEach(() => {
  resetStationForTest()
})

describe('station store', () => {
  it('loadCurrent 填充 current', async () => {
    const svc = mockSvc()
    await stationStore.getState().loadCurrent(svc)
    expect(stationStore.getState().current).toEqual({ uid: 1, name: 'A' })
  })

  it('loadList 填充 list', async () => {
    const svc = mockSvc({
      getListAll: vi.fn().mockResolvedValue([
        { uid: 1, name: 'A' },
        { uid: 2, name: 'B' }
      ])
    })
    await stationStore.getState().loadList(svc)
    expect(stationStore.getState().list).toHaveLength(2)
    expect(stationStore.getState().status).toBe('idle')
  })

  it('loadList 失败时 status=error', async () => {
    const svc = mockSvc({
      getListAll: vi.fn().mockRejectedValue(new Error('boom'))
    })
    await stationStore.getState().loadList(svc)
    expect(stationStore.getState().status).toBe('error')
    expect(stationStore.getState().error?.message).toBe('boom')
  })

  it('setCurrent 调 svc.setCurrent 然后刷新 current', async () => {
    const setCurrent = vi.fn().mockResolvedValue(undefined)
    const getCurrent = vi.fn().mockResolvedValue({ uid: 2, name: 'B' })
    const svc = mockSvc({ setCurrent, getCurrent })
    await stationStore.getState().setCurrent(svc, 2)
    expect(setCurrent).toHaveBeenCalledWith(2)
    expect(stationStore.getState().current).toEqual({ uid: 2, name: 'B' })
  })

  it('next 调 svc.next 然后刷新 current', async () => {
    const next = vi.fn().mockResolvedValue(undefined)
    const getCurrent = vi.fn().mockResolvedValue({ uid: 2, name: 'B' })
    const svc = mockSvc({ next, getCurrent })
    await stationStore.getState().next(svc)
    expect(next).toHaveBeenCalled()
    expect(stationStore.getState().current?.uid).toBe(2)
  })

  it('prev 调 svc.prev 然后刷新 current', async () => {
    const prev = vi.fn().mockResolvedValue(undefined)
    const getCurrent = vi.fn().mockResolvedValue({ uid: 3, name: 'C' })
    const svc = mockSvc({ prev, getCurrent })
    await stationStore.getState().prev(svc)
    expect(prev).toHaveBeenCalled()
    expect(stationStore.getState().current?.uid).toBe(3)
  })

  it('setCurrent 失败时 status=error', async () => {
    const svc = mockSvc({
      setCurrent: vi.fn().mockRejectedValue(new Error('nope'))
    })
    await stationStore.getState().setCurrent(svc, 5)
    expect(stationStore.getState().status).toBe('error')
  })
})
