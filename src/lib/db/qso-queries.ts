import type { Database } from 'sql.js'
import type { CallsignStats, QsoRecord } from '@/types/qso'

const QSO_COLS = [
  'timestamp',
  'freqHz',
  'fromCallsign',
  'fromGrid',
  'toCallsign',
  'toGrid',
  'toComment',
  'mode',
  'relayName',
  'relayAdmin'
] as const

export function createSchema(db: Database): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS qso_logs (
      logId INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp INTEGER NOT NULL,
      freqHz INTEGER NOT NULL,
      fromCallsign TEXT NOT NULL,
      fromGrid TEXT,
      toCallsign TEXT,
      toGrid TEXT,
      toComment TEXT,
      mode TEXT,
      relayName TEXT,
      relayAdmin TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_from_ts ON qso_logs (fromCallsign, timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_from_to ON qso_logs (fromCallsign, toCallsign);
  `)
}

export function insertRecords(db: Database, records: readonly QsoRecord[]): void {
  if (records.length === 0) return
  const placeholders = QSO_COLS.map(() => '?').join(', ')
  const stmt = db.prepare(`INSERT INTO qso_logs (${QSO_COLS.join(', ')}) VALUES (${placeholders})`)
  try {
    db.run('BEGIN')
    for (const r of records) {
      stmt.run(QSO_COLS.map((c) => r[c]))
    }
    db.run('COMMIT')
  } catch (e) {
    db.run('ROLLBACK')
    throw e
  } finally {
    stmt.free()
  }
}

export interface QueryOptions {
  limit?: number
  offset?: number
}

export function queryByFromCallsign(
  db: Database,
  fromCallsign: string,
  { limit, offset }: QueryOptions
): QsoRecord[] {
  let sql = `SELECT ${QSO_COLS.join(', ')} FROM qso_logs WHERE fromCallsign = ? ORDER BY timestamp DESC`
  const params: (string | number)[] = [fromCallsign]
  if (typeof limit === 'number') {
    sql += ' LIMIT ?'
    params.push(limit)
    if (typeof offset === 'number') {
      sql += ' OFFSET ?'
      params.push(offset)
    }
  }
  const stmt = db.prepare(sql)
  try {
    stmt.bind(params)
    const rows: QsoRecord[] = []
    while (stmt.step()) {
      rows.push(stmt.getAsObject() as unknown as QsoRecord)
    }
    return rows
  } finally {
    stmt.free()
  }
}

export function getCallsignStats(
  db: Database,
  { fromCallsign, toCallsign }: { fromCallsign: string; toCallsign: string }
): CallsignStats {
  const stmt = db.prepare(
    `SELECT COUNT(*) AS count, MIN(timestamp) AS firstTime, MAX(timestamp) AS lastTime
     FROM qso_logs WHERE fromCallsign = ? AND toCallsign = ?`
  )
  try {
    stmt.bind([fromCallsign, toCallsign])
    stmt.step()
    const row = stmt.getAsObject() as {
      count: number
      firstTime: number | null
      lastTime: number | null
    }
    return {
      count: row.count,
      firstTime: row.count > 0 ? row.firstTime : null,
      lastTime: row.count > 0 ? row.lastTime : null
    }
  } finally {
    stmt.free()
  }
}
