import { describe, expect, it } from 'vitest'
import { buildAprsPacket } from './packet'

describe('buildAprsPacket', () => {
  const baseParams = {
    fromCall: 'BA0AX',
    fromSsid: 5,
    toCall: 'BY4SDL',
    toSsid: 0,
    action: 'NORMAL',
    timeSlot: 29334000,
    counter: 0,
    secret: 'ABCDEFGHJKLM'
  } as const

  it('生成符合 APRS 格式的数据包', () => {
    const packet = buildAprsPacket(baseParams)
    expect(packet).toMatch(
      /^BA0AX-5>APFMO0,TCPIP\*::BY4SDL {3}:CONTROL,NORMAL,29334000,0,[0-9A-F]{16}$/
    )
  })

  it('addressee 段右填空格到 9 位', () => {
    const packet = buildAprsPacket({ ...baseParams, toCall: 'BY1', toSsid: 0 })
    const match = /::(.{9}):/.exec(packet)
    expect(match?.[1]).toBe('BY1      ')
  })

  it('toSsid > 0 时 addressee 带后缀', () => {
    const packet = buildAprsPacket({ ...baseParams, toCall: 'BA0AX', toSsid: 3 })
    const match = /::(.{9}):/.exec(packet)
    expect(match?.[1]).toBe('BA0AX-3  ')
  })

  it('签名与 calcSignature 字节级一致', () => {
    const packet = buildAprsPacket(baseParams)
    const sig = packet.split(',').pop()
    expect(sig).toHaveLength(16)
    expect(sig).toMatch(/^[0-9A-F]{16}$/)
  })

  it('不同 counter 产生不同签名', () => {
    const p1 = buildAprsPacket({ ...baseParams, counter: 0 })
    const p2 = buildAprsPacket({ ...baseParams, counter: 1 })
    const sig1 = p1.split(',').pop()
    const sig2 = p2.split(',').pop()
    expect(sig1).not.toBe(sig2)
  })

  it('目标呼号超过 9 位时抛错', () => {
    expect(() => buildAprsPacket({ ...baseParams, toCall: 'BY4SDLXYZ', toSsid: 15 })).toThrow(
      /过长/
    )
  })
})
