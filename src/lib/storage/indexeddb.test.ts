import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'
import {
  deleteDatabase,
  deleteItem,
  getAll,
  getAllByIndex,
  getItem,
  openDatabase,
  putItem
} from './indexeddb'

const DB = 'test_db_phase2b'
const STORE = 'items'

afterEach(async () => {
  await deleteDatabase(DB)
})

async function openFixture(): Promise<IDBDatabase> {
  return openDatabase(DB, 1, (db) => {
    if (!db.objectStoreNames.contains(STORE)) {
      const s = db.createObjectStore(STORE, { keyPath: 'id' })
      s.createIndex('by_tag', 'tag', { unique: false })
    }
  })
}

describe('openDatabase', () => {
  it('首次打开时触发升级回调', async () => {
    const db = await openFixture()
    expect(db.objectStoreNames.contains(STORE)).toBe(true)
    db.close()
  })

  it('重复打开不触发升级', async () => {
    let upgrades = 0
    const db1 = await openDatabase(DB, 1, () => upgrades++)
    db1.close()
    const db2 = await openDatabase(DB, 1, () => upgrades++)
    db2.close()
    expect(upgrades).toBe(1)
  })
})

describe('putItem / getItem / getAll', () => {
  it('存取单条记录', async () => {
    const db = await openFixture()
    await putItem(db, STORE, { id: 'a', tag: 'x', value: 1 })
    expect(await getItem(db, STORE, 'a')).toEqual({ id: 'a', tag: 'x', value: 1 })
    db.close()
  })

  it('getItem 找不到时返回 undefined', async () => {
    const db = await openFixture()
    expect(await getItem(db, STORE, 'missing')).toBeUndefined()
    db.close()
  })

  it('getAll 返回全部记录', async () => {
    const db = await openFixture()
    await putItem(db, STORE, { id: 'a', tag: 'x' })
    await putItem(db, STORE, { id: 'b', tag: 'y' })
    const all = await getAll<{ id: string; tag: string }>(db, STORE)
    expect(all).toHaveLength(2)
    expect(all.map((r) => r.id).sort()).toEqual(['a', 'b'])
    db.close()
  })
})

describe('getAllByIndex', () => {
  it('按索引筛选', async () => {
    const db = await openFixture()
    await putItem(db, STORE, { id: 'a', tag: 'x' })
    await putItem(db, STORE, { id: 'b', tag: 'y' })
    await putItem(db, STORE, { id: 'c', tag: 'x' })
    const xs = await getAllByIndex(db, STORE, 'by_tag', 'x')
    expect(xs).toHaveLength(2)
    db.close()
  })
})

describe('deleteItem', () => {
  it('删除后读取返回 undefined', async () => {
    const db = await openFixture()
    await putItem(db, STORE, { id: 'a', tag: 'x' })
    await deleteItem(db, STORE, 'a')
    expect(await getItem(db, STORE, 'a')).toBeUndefined()
    db.close()
  })
})

describe('deleteDatabase', () => {
  it('删除后下次打开触发升级', async () => {
    const db = await openFixture()
    await putItem(db, STORE, { id: 'a', tag: 'x' })
    db.close()
    await deleteDatabase(DB)

    let upgraded = false
    const db2 = await openDatabase(DB, 1, () => {
      upgraded = true
    })
    expect(upgraded).toBe(true)
    db2.close()
  })
})
