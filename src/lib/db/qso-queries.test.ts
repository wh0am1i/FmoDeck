import { beforeEach, describe, expect, it } from 'vitest'
import type { Database } from 'sql.js'
import { loadSql } from './sql-loader'
import { makeQso } from './fixtures'
import { createSchema, getCallsignStats, insertRecords, queryByFromCallsign } from './qso-queries'

let db: Database

beforeEach(async () => {
  const SQL = await loadSql()
  db = new SQL.Database()
  createSchema(db)
})

describe('createSchema', () => {
  it('建立 qso_logs 表 + 索引', () => {
    const tables = db.exec("SELECT name FROM sqlite_master WHERE type='table'")
    expect(tables[0]?.values.flat()).toContain('qso_logs')
  })
})

describe('insertRecords + queryByFromCallsign', () => {
  it('插入后能按 fromCallsign 查询', () => {
    insertRecords(db, [
      makeQso({ fromCallsign: 'BA0AX', toCallsign: 'BY4SDL', timestamp: 1000 }),
      makeQso({ fromCallsign: 'BA0AX', toCallsign: 'BY1ABC', timestamp: 2000 }),
      makeQso({ fromCallsign: 'BY1XYZ', toCallsign: 'BA0AX', timestamp: 3000 })
    ])
    const rows = queryByFromCallsign(db, 'BA0AX', {})
    expect(rows).toHaveLength(2)
    expect(rows.map((r) => r.toCallsign).sort()).toEqual(['BY1ABC', 'BY4SDL'])
  })

  it('按时间倒序返回', () => {
    insertRecords(db, [
      makeQso({ fromCallsign: 'BA0AX', timestamp: 1000 }),
      makeQso({ fromCallsign: 'BA0AX', timestamp: 3000 }),
      makeQso({ fromCallsign: 'BA0AX', timestamp: 2000 })
    ])
    const rows = queryByFromCallsign(db, 'BA0AX', {})
    expect(rows.map((r) => r.timestamp)).toEqual([3000, 2000, 1000])
  })

  it('支持 limit 和 offset', () => {
    insertRecords(
      db,
      Array.from({ length: 10 }, (_, i) => makeQso({ fromCallsign: 'BA0AX', timestamp: i * 1000 }))
    )
    const page1 = queryByFromCallsign(db, 'BA0AX', { limit: 3, offset: 0 })
    const page2 = queryByFromCallsign(db, 'BA0AX', { limit: 3, offset: 3 })
    expect(page1).toHaveLength(3)
    expect(page2).toHaveLength(3)
    expect(page1[0]?.timestamp).toBe(9000)
    expect(page2[0]?.timestamp).toBe(6000)
  })

  it('中文 toComment 字段正确保存', () => {
    insertRecords(db, [
      makeQso({ fromCallsign: 'BA0AX', toCallsign: 'BY4SDL', toComment: '你好世界 🚀' })
    ])
    const [row] = queryByFromCallsign(db, 'BA0AX', {})
    expect(row?.toComment).toBe('你好世界 🚀')
  })
})

describe('getCallsignStats（SpeakingBar 用）', () => {
  it('返回 {count, firstTime, lastTime}', () => {
    insertRecords(db, [
      makeQso({ fromCallsign: 'BA0AX', toCallsign: 'BY4SDL', timestamp: 1000 }),
      makeQso({ fromCallsign: 'BA0AX', toCallsign: 'BY4SDL', timestamp: 2000 }),
      makeQso({ fromCallsign: 'BA0AX', toCallsign: 'BY4SDL', timestamp: 3000 }),
      makeQso({ fromCallsign: 'BA0AX', toCallsign: 'BY1ABC', timestamp: 4000 })
    ])
    const stats = getCallsignStats(db, { fromCallsign: 'BA0AX', toCallsign: 'BY4SDL' })
    expect(stats).toEqual({ count: 3, firstTime: 1000, lastTime: 3000 })
  })

  it('无记录返回 count=0 + 时间为 null', () => {
    const stats = getCallsignStats(db, { fromCallsign: 'BA0AX', toCallsign: 'NOBODY' })
    expect(stats).toEqual({ count: 0, firstTime: null, lastTime: null })
  })
})
