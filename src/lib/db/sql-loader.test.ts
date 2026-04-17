import { describe, expect, it } from 'vitest'
import { loadSql } from './sql-loader'

describe('loadSql · 冒烟', () => {
  it('返回 SqlJs.Database 可用实例', async () => {
    const SQL = await loadSql()
    const db = new SQL.Database()
    db.run('CREATE TABLE t (id INTEGER, name TEXT);')
    db.run('INSERT INTO t VALUES (1, "ba0ax");')
    const rows = db.exec('SELECT * FROM t;')
    expect(rows).toHaveLength(1)
    expect(rows[0]?.values).toEqual([[1, 'ba0ax']])
    db.close()
  }, 15000)

  it('多次调用复用同一 SqlJsStatic 实例', async () => {
    const a = await loadSql()
    const b = await loadSql()
    expect(a).toBe(b)
  })
})
