import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'
import { clearAllLocalQsos, deleteLocalQso, insertLocalQsos, loadAllLocalQsos } from './qso-repo'
import type { LocalQso } from '@/types/qso'

function make(id: string, timestamp: number, overrides: Partial<LocalQso> = {}): LocalQso {
  return {
    id,
    timestamp,
    toCallsign: `CALL${id}`,
    grid: 'OM89',
    fields: { call: `CALL${id}` },
    ...overrides
  }
}

afterEach(async () => {
  await clearAllLocalQsos()
})

describe('qso-repo', () => {
  it('插入后能读取', async () => {
    await insertLocalQsos([make('a', 1000), make('b', 2000)])
    const list = await loadAllLocalQsos()
    expect(list).toHaveLength(2)
  })

  it('读取按 timestamp 倒序', async () => {
    await insertLocalQsos([make('a', 1000), make('b', 3000), make('c', 2000)])
    const list = await loadAllLocalQsos()
    expect(list.map((r) => r.id)).toEqual(['b', 'c', 'a'])
  })

  it('相同 id 覆盖（put 语义）', async () => {
    await insertLocalQsos([make('a', 1000, { grid: 'OLD' })])
    await insertLocalQsos([make('a', 1000, { grid: 'NEW' })])
    const list = await loadAllLocalQsos()
    expect(list).toHaveLength(1)
    expect(list[0]?.grid).toBe('NEW')
  })

  it('deleteLocalQso 删单条', async () => {
    await insertLocalQsos([make('a', 1000), make('b', 2000)])
    await deleteLocalQso('a')
    const list = await loadAllLocalQsos()
    expect(list.map((r) => r.id)).toEqual(['b'])
  })

  it('空数组 insert 不报错', async () => {
    await insertLocalQsos([])
    expect(await loadAllLocalQsos()).toEqual([])
  })

  it('clearAllLocalQsos 清空', async () => {
    await insertLocalQsos([make('a', 1000)])
    await clearAllLocalQsos()
    expect(await loadAllLocalQsos()).toEqual([])
  })

  it('fields 字段保留原 ADIF 内容', async () => {
    await insertLocalQsos([
      make('a', 1000, {
        fields: { call: 'BA0AX', freq: '144.640', mode: 'FM', comment: '测试 🚀' }
      })
    ])
    const [rec] = await loadAllLocalQsos()
    expect(rec?.fields).toEqual({
      call: 'BA0AX',
      freq: '144.640',
      mode: 'FM',
      comment: '测试 🚀'
    })
  })
})
