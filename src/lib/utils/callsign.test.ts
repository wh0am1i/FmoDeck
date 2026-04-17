import { describe, expect, it } from 'vitest'
import {
  CALLSIGN_REGEX,
  formatAddressee,
  isValidChineseCallsign,
  parseCallsignSsid
} from './callsign'

describe('parseCallsignSsid', () => {
  it('大写化并去空白', () => {
    expect(parseCallsignSsid('  ba0ax  ')).toEqual({ call: 'BA0AX', ssid: 0 })
  })

  it('不含 SSID 时返回 0', () => {
    expect(parseCallsignSsid('BA0AX')).toEqual({ call: 'BA0AX', ssid: 0 })
  })

  it('解析 CALL-SSID 格式', () => {
    expect(parseCallsignSsid('BA0AX-5')).toEqual({ call: 'BA0AX', ssid: 5 })
    expect(parseCallsignSsid('BA0AX-15')).toEqual({ call: 'BA0AX', ssid: 15 })
  })

  it('空呼号抛错', () => {
    expect(() => parseCallsignSsid('')).toThrow(/空/)
    expect(() => parseCallsignSsid('   ')).toThrow(/空/)
  })

  it('SSID 超出范围抛错', () => {
    expect(() => parseCallsignSsid('BA0AX-16')).toThrow(/SSID/)
    expect(() => parseCallsignSsid('BA0AX--1')).toThrow(/SSID/)
  })

  it('SSID 非数字抛错', () => {
    expect(() => parseCallsignSsid('BA0AX-abc')).toThrow(/SSID/)
  })
})

describe('formatAddressee', () => {
  it('SSID=0 时不加后缀', () => {
    expect(formatAddressee('BA0AX', 0)).toBe('BA0AX    ')
  })

  it('SSID>0 时追加 -N', () => {
    expect(formatAddressee('BA0AX', 5)).toBe('BA0AX-5  ')
  })

  it('右填充空格到 9 位', () => {
    expect(formatAddressee('BA0AX', 0)).toHaveLength(9)
    expect(formatAddressee('BA0AX', 15)).toHaveLength(9)
    expect(formatAddressee('BY4SDL', 0)).toHaveLength(9)
  })

  it('超过 9 位抛错', () => {
    expect(() => formatAddressee('BA0AXXXXX', 15)).toThrow(/过长/)
  })
})

describe('CALLSIGN_REGEX · 中国 BY 呼号', () => {
  it('接受合法格式', () => {
    expect(CALLSIGN_REGEX.test('BA0AX')).toBe(true)
    expect(CALLSIGN_REGEX.test('BY4SDL')).toBe(true)
    expect(CALLSIGN_REGEX.test('BG1ABC')).toBe(true)
  })

  it('拒绝非法格式', () => {
    expect(CALLSIGN_REGEX.test('W1AW')).toBe(false)
    expect(CALLSIGN_REGEX.test('B0A')).toBe(false)
    expect(CALLSIGN_REGEX.test('ba0ax')).toBe(false)
    expect(CALLSIGN_REGEX.test('BA0AXXXX')).toBe(false)
  })
})

describe('isValidChineseCallsign（基号校验）', () => {
  it('忽略 SSID 只校验基号', () => {
    expect(isValidChineseCallsign('BA0AX-5')).toBe(true)
    expect(isValidChineseCallsign('BA0AX')).toBe(true)
  })

  it('基号非法返回 false', () => {
    expect(isValidChineseCallsign('W1AW')).toBe(false)
  })

  it('解析失败返回 false（不抛错）', () => {
    expect(isValidChineseCallsign('')).toBe(false)
    expect(isValidChineseCallsign('BA0AX-99')).toBe(false)
  })
})
