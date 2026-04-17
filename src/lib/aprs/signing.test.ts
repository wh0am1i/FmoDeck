import { describe, expect, it } from 'vitest'
import baseline from './signing.baseline.json' with { type: 'json' }
import { calcSignature, getTimeSlot } from './signing'

interface BaselineCase {
  fromCall: string
  fromSsid: number
  type: string
  action: string
  timeSlot: number
  counter: number
  secret: string
  expected: string
}

describe('calcSignature · FmoLogs baseline fidelity', () => {
  for (const [i, c] of (baseline as BaselineCase[]).entries()) {
    it(`case ${i + 1}: ${c.fromCall}-${c.fromSsid} ${c.action} @${c.timeSlot}/${c.counter}`, () => {
      const sig = calcSignature(
        c.fromCall,
        c.fromSsid,
        c.type,
        c.action,
        c.timeSlot,
        c.counter,
        c.secret
      )
      expect(sig).toBe(c.expected)
    })
  }
})

describe('calcSignature · 形态', () => {
  it('返回 16 位大写 hex', () => {
    const sig = calcSignature('BA0AX', 5, 'CONTROL', 'NORMAL', 29334000, 0, 'ABCDEFGHJKLM')
    expect(sig).toMatch(/^[0-9A-F]{16}$/)
  })

  it('改变任一输入参数签名应不同', () => {
    const base = calcSignature('BA0AX', 5, 'CONTROL', 'NORMAL', 29334000, 0, 'ABCDEFGHJKLM')
    expect(calcSignature('BA0AX', 6, 'CONTROL', 'NORMAL', 29334000, 0, 'ABCDEFGHJKLM')).not.toBe(
      base
    )
    expect(calcSignature('BA0AX', 5, 'CONTROL', 'REBOOT', 29334000, 0, 'ABCDEFGHJKLM')).not.toBe(
      base
    )
    expect(calcSignature('BA0AX', 5, 'CONTROL', 'NORMAL', 29334001, 0, 'ABCDEFGHJKLM')).not.toBe(
      base
    )
    expect(calcSignature('BA0AX', 5, 'CONTROL', 'NORMAL', 29334000, 1, 'ABCDEFGHJKLM')).not.toBe(
      base
    )
    expect(calcSignature('BA0AX', 5, 'CONTROL', 'NORMAL', 29334000, 0, 'ZZZZZZZZZZZZ')).not.toBe(
      base
    )
  })
})

describe('getTimeSlot', () => {
  it('返回分钟级时间槽', () => {
    expect(getTimeSlot(1776038400000)).toBe(29600640)
    expect(getTimeSlot(1776038459000)).toBe(29600640)
    expect(getTimeSlot(1776038460000)).toBe(29600641)
  })

  it('不传参数时使用 Date.now()', () => {
    const before = Math.floor(Date.now() / 1000 / 60)
    const slot = getTimeSlot()
    const after = Math.floor(Date.now() / 1000 / 60)
    expect(slot).toBeGreaterThanOrEqual(before)
    expect(slot).toBeLessThanOrEqual(after)
  })
})
