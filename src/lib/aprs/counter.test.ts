import { beforeEach, describe, expect, it } from 'vitest'
import { AprsCounter, type CounterStorage } from './counter'

function createMemoryStorage(): CounterStorage {
  const store = new Map<string, string>()
  return {
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, v) => void store.set(k, v),
    removeItem: (k) => void store.delete(k)
  }
}

describe('AprsCounter', () => {
  let storage: CounterStorage
  let counter: AprsCounter

  beforeEach(() => {
    storage = createMemoryStorage()
    counter = new AprsCounter(storage)
  })

  it('首次调用返回 0', () => {
    expect(counter.next(29334000)).toBe(0)
  })

  it('同槽连续递增', () => {
    expect(counter.next(29334000)).toBe(0)
    expect(counter.next(29334000)).toBe(1)
    expect(counter.next(29334000)).toBe(2)
  })

  it('换槽归零', () => {
    expect(counter.next(29334000)).toBe(0)
    expect(counter.next(29334000)).toBe(1)
    expect(counter.next(29334001)).toBe(0)
    expect(counter.next(29334001)).toBe(1)
  })

  it('写入后 storage 含 time_slot + counter + last_updated', () => {
    counter.next(29334000)
    const raw = storage.getItem('fmo_aprs_counter')
    expect(raw).not.toBeNull()
    const parsed: unknown = JSON.parse(raw!)
    expect(parsed).toMatchObject({
      time_slot: 29334000,
      counter: 0
    })
    expect((parsed as { last_updated: string }).last_updated).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('损坏的 JSON 被忽略，按首次处理', () => {
    storage.setItem('fmo_aprs_counter', '{not valid json')
    expect(counter.next(29334000)).toBe(0)
  })

  it('多个实例共享同一 storage 时保持一致', () => {
    const a = new AprsCounter(storage)
    const b = new AprsCounter(storage)
    expect(a.next(29334000)).toBe(0)
    expect(b.next(29334000)).toBe(1)
    expect(a.next(29334000)).toBe(2)
  })

  it('兼容 FmoLogs 旧数据（无 last_updated 字段）', () => {
    storage.setItem('fmo_aprs_counter', JSON.stringify({ time_slot: 29334000, counter: 5 }))
    expect(counter.next(29334000)).toBe(6)
  })
})
