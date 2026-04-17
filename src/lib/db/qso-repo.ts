import {
  deleteItem,
  getAll,
  openDatabase,
  putItem,
  deleteDatabase as rawDeleteDatabase
} from '@/lib/storage/indexeddb'
import type { LocalQso } from '@/types/qso'

/** IndexedDB 名（业务库，和 FmoLogs 的 `FmoLogsData` 区分）。 */
const DB_NAME = 'fmodeck-qsos'
const STORE = 'local_qsos'
const VERSION = 1

function openRepo(): Promise<IDBDatabase> {
  return openDatabase(DB_NAME, VERSION, (db) => {
    if (!db.objectStoreNames.contains(STORE)) {
      const s = db.createObjectStore(STORE, { keyPath: 'id' })
      s.createIndex('by_timestamp', 'timestamp', { unique: false })
      s.createIndex('by_callsign', 'toCallsign', { unique: false })
    }
  })
}

/** 批量插入。已有 id 会被覆盖（put 语义）。 */
export async function insertLocalQsos(records: readonly LocalQso[]): Promise<void> {
  if (records.length === 0) return
  const db = await openRepo()
  try {
    for (const r of records) {
      await putItem(db, STORE, r)
    }
  } finally {
    db.close()
  }
}

/**
 * 读全部。按 timestamp 倒序（新的在前），并按 (呼号, 时间戳) 去重。
 *
 * 去重的动机：老版本生成的 id 带 `-{index}` 后缀，同一条 QSO 行顺序变了
 * 就会被当成新记录存一份。读取时按内容去重，让 UI 看起来是干净的；
 * 保留内容等同的首条。DB 里残留的旧记录不会被主动清（等用户下次
 * "清空本地"时一起去掉，或之后的 import 覆盖到新 id 上）。
 */
export async function loadAllLocalQsos(): Promise<LocalQso[]> {
  const db = await openRepo()
  try {
    const list = await getAll<LocalQso>(db, STORE)
    const sorted = list.sort((a, b) => b.timestamp - a.timestamp)
    const seen = new Set<string>()
    const deduped: LocalQso[] = []
    for (const r of sorted) {
      const key = `${r.toCallsign}\u0001${r.timestamp}`
      if (seen.has(key)) continue
      seen.add(key)
      deduped.push(r)
    }
    return deduped
  } finally {
    db.close()
  }
}

/** 删一条。 */
export async function deleteLocalQso(id: string): Promise<void> {
  const db = await openRepo()
  try {
    await deleteItem(db, STORE, id)
  } finally {
    db.close()
  }
}

/** 清空整个本地 QSO 库（测试 / "清空本地" 按钮用）。 */
export async function clearAllLocalQsos(): Promise<void> {
  await rawDeleteDatabase(DB_NAME)
}
