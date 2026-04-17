import { describe, expect, it } from 'vitest'
import { computeAprsPasscode } from './aprs-passcode'

describe('computeAprsPasscode', () => {
  it.each([
    ['N0CALL', 13023],
    ['W1AW', 25988],
    ['BH6SCA', 17592],
    ['BA0AX', 23010],
    ['BG1ABC', 17063]
  ])('%s → %i', (call, expected) => {
    expect(computeAprsPasscode(call)).toBe(expected)
  })

  it('大小写无关', () => {
    expect(computeAprsPasscode('bh6sca')).toBe(computeAprsPasscode('BH6SCA'))
    expect(computeAprsPasscode('w1aw')).toBe(25988)
  })

  it('SSID 后缀被忽略', () => {
    expect(computeAprsPasscode('BH6SCA-5')).toBe(computeAprsPasscode('BH6SCA'))
    expect(computeAprsPasscode('BH6SCA-15')).toBe(computeAprsPasscode('BH6SCA'))
  })

  it('外围空白被 trim', () => {
    expect(computeAprsPasscode('  BH6SCA  ')).toBe(17592)
  })

  it('空呼号返回 -1', () => {
    expect(computeAprsPasscode('')).toBe(-1)
    expect(computeAprsPasscode('   ')).toBe(-1)
    expect(computeAprsPasscode('-5')).toBe(-1)
  })

  it('结果在 [0, 0x7FFF] 范围内', () => {
    for (const call of ['A', 'AB', 'ABC', 'ABCD', 'ABCDE', 'ABCDEF', 'ABCDEFG']) {
      const p = computeAprsPasscode(call)
      expect(p).toBeGreaterThanOrEqual(0)
      expect(p).toBeLessThanOrEqual(0x7fff)
    }
  })
})
