import { describe, expect, it } from 'vitest'
import { compareVersion } from './version-compare'

describe('compareVersion', () => {
  it('lower < higher', () => {
    expect(compareVersion('0.1.5', '0.1.6')).toBeLessThan(0)
  })
  it('numeric not string compare', () => {
    expect(compareVersion('0.1.10', '0.1.9')).toBeGreaterThan(0)
  })
  it('equal', () => {
    expect(compareVersion('0.1.5', '0.1.5')).toBe(0)
  })
  it('tolerates v prefix', () => {
    expect(compareVersion('v0.1.5', '0.1.6')).toBeLessThan(0)
    expect(compareVersion('0.1.5', 'v0.1.5')).toBe(0)
  })
  it('invalid → NaN', () => {
    expect(compareVersion('not-a-version', '0.1.5')).toBeNaN()
    expect(compareVersion('0.1.5', 'garbage')).toBeNaN()
  })
  it('major / minor', () => {
    expect(compareVersion('1.0.0', '0.99.99')).toBeGreaterThan(0)
    expect(compareVersion('0.2.0', '0.1.99')).toBeGreaterThan(0)
  })
})
