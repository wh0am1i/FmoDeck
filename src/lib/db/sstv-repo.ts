// src/lib/db/sstv-repo.ts
import { nanoid } from 'nanoid'
import {
  deleteItem,
  getAll,
  getItem,
  openDatabase,
  putItem,
  deleteDatabase as rawDeleteDatabase
} from '@/lib/storage/indexeddb'
import type { SstvImage } from '@/types/sstv'

const DB_NAME = 'fmodeck-sstv'
const STORE = 'images'
const VERSION = 1

function openRepo(): Promise<IDBDatabase> {
  return openDatabase(DB_NAME, VERSION, (db) => {
    if (!db.objectStoreNames.contains(STORE)) {
      const s = db.createObjectStore(STORE, { keyPath: 'id' })
      s.createIndex('by_createdAt', 'createdAt', { unique: false })
    }
  })
}

export interface ListOpts {
  /** 最多返回多少条(默认 50)。 */
  limit?: number
  /** 只返回 createdAt < before 的(用于游标分页)。 */
  before?: number
}

export const sstvRepo = {
  async add(input: Omit<SstvImage, 'id' | 'createdAt'>): Promise<SstvImage> {
    const record: SstvImage = {
      id: nanoid(16),
      createdAt: Date.now(),
      ...input
    }
    const db = await openRepo()
    try {
      await putItem(db, STORE, record)
    } finally {
      db.close()
    }
    return record
  },

  async list(opts: ListOpts = {}): Promise<SstvImage[]> {
    const { limit = 50, before } = opts
    const db = await openRepo()
    try {
      const all = await getAll<SstvImage>(db, STORE)
      const filtered = before === undefined ? all : all.filter((r) => r.createdAt < before)
      filtered.sort((a, b) => b.createdAt - a.createdAt)
      return filtered.slice(0, limit)
    } finally {
      db.close()
    }
  },

  async get(id: string): Promise<SstvImage | null> {
    const db = await openRepo()
    try {
      return (await getItem<SstvImage>(db, STORE, id)) ?? null
    } finally {
      db.close()
    }
  },

  async delete(id: string): Promise<void> {
    const db = await openRepo()
    try {
      await deleteItem(db, STORE, id)
    } finally {
      db.close()
    }
  },

  async count(): Promise<number> {
    const db = await openRepo()
    try {
      const all = await getAll<SstvImage>(db, STORE)
      return all.length
    } finally {
      db.close()
    }
  },

  async clear(): Promise<void> {
    await rawDeleteDatabase(DB_NAME)
  }
}
