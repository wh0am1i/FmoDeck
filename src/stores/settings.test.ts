import { afterEach, describe, expect, it } from 'vitest'
import { resetSettingsForTest, settingsStore } from './settings'

afterEach(() => {
  resetSettingsForTest()
  localStorage.clear()
})

describe('settings store', () => {
  it('默认值正确', () => {
    const s = settingsStore.getState()
    expect(s.fmoAddresses).toEqual([])
    expect(s.activeAddressId).toBeNull()
    expect(s.currentCallsign).toBe('')
    expect(s.protocol).toBe('ws')
  })

  it('addAddress 追加并可取回', () => {
    settingsStore.getState().addAddress({ id: 'a', host: 'fmo.local' })
    expect(settingsStore.getState().fmoAddresses).toEqual([{ id: 'a', host: 'fmo.local' }])
  })

  it('setActiveAddress 切换激活项', () => {
    const { addAddress, setActiveAddress } = settingsStore.getState()
    addAddress({ id: 'a', host: 'fmo.local' })
    addAddress({ id: 'b', host: 'other.local' })
    setActiveAddress('b')
    expect(settingsStore.getState().activeAddressId).toBe('b')
  })

  it('removeAddress 删除条目；若激活被删则 activeAddressId 置空', () => {
    const { addAddress, setActiveAddress, removeAddress } = settingsStore.getState()
    addAddress({ id: 'a', host: 'fmo.local' })
    setActiveAddress('a')
    removeAddress('a')
    const s = settingsStore.getState()
    expect(s.fmoAddresses).toEqual([])
    expect(s.activeAddressId).toBeNull()
  })

  it('setCurrentCallsign 强制大写', () => {
    settingsStore.getState().setCurrentCallsign('ba0ax')
    expect(settingsStore.getState().currentCallsign).toBe('BA0AX')
  })

  it('setProtocol 只接受 ws | wss', () => {
    settingsStore.getState().setProtocol('wss')
    expect(settingsStore.getState().protocol).toBe('wss')
  })
})

describe('settings 持久化', () => {
  it('写入后反序列化重建 state', () => {
    settingsStore.getState().addAddress({ id: 'a', host: 'fmo.local' })
    settingsStore.getState().setActiveAddress('a')
    settingsStore.getState().setCurrentCallsign('BA0AX')

    const raw = localStorage.getItem('fmodeck-settings')
    expect(raw).not.toBeNull()
    const parsed = JSON.parse(raw!) as {
      state: { currentCallsign: string; activeAddressId: string }
    }
    expect(parsed.state.currentCallsign).toBe('BA0AX')
    expect(parsed.state.activeAddressId).toBe('a')
  })
})
