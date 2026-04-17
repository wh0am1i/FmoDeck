import { afterEach, describe, expect, it } from 'vitest'
import { resetSettingsForTest, selectActiveSyncMode, settingsStore } from './settings'

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

  it('addAddress 首次添加时自动激活', () => {
    settingsStore.getState().addAddress({ id: 'a', host: 'fmo.local' })
    expect(settingsStore.getState().activeAddressId).toBe('a')
  })

  it('addAddress 已有激活项时不改变激活', () => {
    const { addAddress, setActiveAddress } = settingsStore.getState()
    addAddress({ id: 'a', host: 'a.local' })
    setActiveAddress('a')
    addAddress({ id: 'b', host: 'b.local' })
    expect(settingsStore.getState().activeAddressId).toBe('a')
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

  it('updateAddress 合并 patch', () => {
    const { addAddress, updateAddress } = settingsStore.getState()
    addAddress({ id: 'a', host: 'fmo.local' })
    updateAddress('a', { name: '家里', syncMode: 'today' })
    const [addr] = settingsStore.getState().fmoAddresses
    expect(addr).toEqual({ id: 'a', host: 'fmo.local', name: '家里', syncMode: 'today' })
  })

  it('updateAddress 对不存在的 id 静默忽略', () => {
    settingsStore.getState().updateAddress('missing', { name: 'x' })
    expect(settingsStore.getState().fmoAddresses).toEqual([])
  })
})

describe('selectActiveSyncMode', () => {
  it('无激活地址时返回 all', () => {
    expect(selectActiveSyncMode(settingsStore.getState())).toBe('all')
  })

  it('激活地址未设 syncMode 时返回 all', () => {
    settingsStore.setState({
      fmoAddresses: [{ id: 'a', host: 'fmo.local' }],
      activeAddressId: 'a'
    })
    expect(selectActiveSyncMode(settingsStore.getState())).toBe('all')
  })

  it('返回激活地址的 syncMode', () => {
    settingsStore.setState({
      fmoAddresses: [{ id: 'a', host: 'fmo.local', syncMode: 'today' }],
      activeAddressId: 'a'
    })
    expect(selectActiveSyncMode(settingsStore.getState())).toBe('today')
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
