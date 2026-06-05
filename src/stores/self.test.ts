import { beforeEach, describe, expect, it } from 'vitest'
import { selfStore, resetSelfForTest } from './self'

describe('selfStore.coordinate', () => {
  beforeEach(() => resetSelfForTest())

  it('默认 coordinate 为 null', () => {
    expect(selfStore.getState().coordinate).toBeNull()
  })
  it('setCoordinate 写入', () => {
    selfStore.getState().setCoordinate({ lat: 31.2, lng: 121.4 })
    expect(selfStore.getState().coordinate).toEqual({ lat: 31.2, lng: 121.4 })
  })
  it('resetSelfForTest 清空 callsign 与 coordinate', () => {
    selfStore.getState().setCallsign('BA0AX')
    selfStore.getState().setCoordinate({ lat: 1, lng: 2 })
    resetSelfForTest()
    expect(selfStore.getState().callsign).toBeNull()
    expect(selfStore.getState().coordinate).toBeNull()
  })
})
