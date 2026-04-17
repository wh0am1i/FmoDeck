import { describe, expect, it, vi } from 'vitest'
import { DeviceControlService } from './client'
import type { FmoApiClient } from '@/lib/fmo-api/client'

function mockClient(): FmoApiClient {
  return {
    send: vi.fn(),
    onPush: vi.fn()
  } as unknown as FmoApiClient
}

describe('DeviceControlService.setScreenMode', () => {
  it('mode=0 发送 {mode:0}', async () => {
    const api = mockClient()
    vi.mocked(api.send).mockResolvedValue({
      type: 'ui',
      subType: 'setScreenModeResponse',
      code: 0,
      data: null
    })
    await new DeviceControlService(api).setScreenMode(0)
    expect(api.send).toHaveBeenCalledWith({
      type: 'ui',
      subType: 'setScreenMode',
      data: { mode: 0 }
    })
  })

  it('mode=1 发送 {mode:1}', async () => {
    const api = mockClient()
    vi.mocked(api.send).mockResolvedValue({
      type: 'ui',
      subType: 'setScreenModeResponse',
      code: 0,
      data: null
    })
    await new DeviceControlService(api).setScreenMode(1)
    expect(api.send).toHaveBeenCalledWith({
      type: 'ui',
      subType: 'setScreenMode',
      data: { mode: 1 }
    })
  })

  it('非 0 code 抛错', async () => {
    const api = mockClient()
    vi.mocked(api.send).mockResolvedValue({
      type: 'ui',
      subType: 'setScreenModeResponse',
      code: 1,
      data: null
    })
    await expect(new DeviceControlService(api).setScreenMode(0)).rejects.toThrow(/code=1/)
  })
})

describe('DeviceControlService.restartAprsService', () => {
  it('发送 {type:config, subType:restartAprsService, data:{}}', async () => {
    const api = mockClient()
    vi.mocked(api.send).mockResolvedValue({
      type: 'config',
      subType: 'restartAprsServiceResponse',
      code: 0,
      data: { result: 0 }
    })
    await new DeviceControlService(api).restartAprsService()
    expect(api.send).toHaveBeenCalledWith({
      type: 'config',
      subType: 'restartAprsService',
      data: {}
    })
  })

  it('非 0 code 抛错', async () => {
    const api = mockClient()
    vi.mocked(api.send).mockResolvedValue({
      type: 'config',
      subType: 'restartAprsServiceResponse',
      code: 2,
      data: null
    })
    await expect(new DeviceControlService(api).restartAprsService()).rejects.toThrow(/code=2/)
  })
})
