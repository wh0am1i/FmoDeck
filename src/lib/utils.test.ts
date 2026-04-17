import { describe, expect, it } from 'vitest'
import { cn } from './utils'

describe('cn', () => {
  it('合并普通字符串', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('忽略 falsy 值', () => {
    expect(cn('foo', false, undefined, null, '', 'bar')).toBe('foo bar')
  })

  it('处理对象形式的条件类', () => {
    expect(cn('foo', { bar: true, baz: false })).toBe('foo bar')
  })

  it('处理数组', () => {
    expect(cn(['foo', 'bar'], 'baz')).toBe('foo bar baz')
  })

  it('去重冲突的 Tailwind 类（后者覆盖前者）', () => {
    expect(cn('p-4', 'p-6')).toBe('p-6')
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500')
  })

  it('保留不冲突的类', () => {
    expect(cn('p-4', 'm-2')).toBe('p-4 m-2')
  })
})
