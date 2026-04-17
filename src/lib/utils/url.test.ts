import { describe, expect, it } from 'vitest'
import { normalizeHost } from './url'

describe('normalizeHost', () => {
  it('空值返回空字符串', () => {
    expect(normalizeHost('')).toBe('')
    expect(normalizeHost('   ')).toBe('')
  })

  it('去除 http/https 协议前缀', () => {
    expect(normalizeHost('http://fmo.local')).toBe('fmo.local')
    expect(normalizeHost('https://fmo.local')).toBe('fmo.local')
  })

  it('去除 ws/wss 协议前缀', () => {
    expect(normalizeHost('ws://fmo.local/ws')).toBe('fmo.local/ws')
    expect(normalizeHost('wss://fmo.local/ws')).toBe('fmo.local/ws')
  })

  it('去除尾部斜杠（含多连斜杠）', () => {
    expect(normalizeHost('fmo.local/')).toBe('fmo.local')
    expect(normalizeHost('fmo.local///')).toBe('fmo.local')
  })

  it('同时处理协议前缀和尾斜杠', () => {
    expect(normalizeHost('https://fmo.local/')).toBe('fmo.local')
  })

  it('保留端口和路径', () => {
    expect(normalizeHost('https://fmo.local:8080/api')).toBe('fmo.local:8080/api')
  })

  it('trim 外围空白', () => {
    expect(normalizeHost('  https://fmo.local  ')).toBe('fmo.local')
  })
})
