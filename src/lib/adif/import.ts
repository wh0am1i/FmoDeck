import type { AdifRecord } from './parser'
import type { LocalQso } from '@/types/qso'

/**
 * 把 ADIF 的 `qso_date`(YYYYMMDD) + `time_on`(HHMM 或 HHMMSS) 解成 Unix 秒（UTC）。
 * 任一字段缺失或格式错误返回 null。
 */
export function adifDateTimeToUnix(
  qsoDate: string | undefined,
  timeOn: string | undefined
): number | null {
  if (qsoDate?.length !== 8) return null
  const year = Number.parseInt(qsoDate.slice(0, 4), 10)
  const month = Number.parseInt(qsoDate.slice(4, 6), 10)
  const day = Number.parseInt(qsoDate.slice(6, 8), 10)
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null

  let hour = 0
  let minute = 0
  let second = 0
  if (timeOn) {
    if (timeOn.length >= 4) {
      hour = Number.parseInt(timeOn.slice(0, 2), 10)
      minute = Number.parseInt(timeOn.slice(2, 4), 10)
    }
    if (timeOn.length >= 6) {
      second = Number.parseInt(timeOn.slice(4, 6), 10)
    }
    if (!Number.isFinite(hour) || !Number.isFinite(minute) || !Number.isFinite(second)) {
      return null
    }
  }
  const ms = Date.UTC(year, month - 1, day, hour, minute, second)
  if (Number.isNaN(ms)) return null
  return Math.floor(ms / 1000)
}

/**
 * 把一条 ADIF 记录映射到 LocalQso。
 *
 * - `id` = `local-{qso_date}-{time_on}-{call}`（仅依赖内容，不带行号）
 *   一条 QSO 用 (日期, 时间, 呼号) 唯一标识；同一条再导入会 upsert 覆盖，
 *   不产生重复。
 *   注：第二个参数 `_index` 保留签名兼容 adifRecordsToLocal，但不再参与 id。
 * - `timestamp` 从 `qso_date` + `time_on` 解析（UTC）
 * - `toCallsign` ← `call`
 * - `grid` ← `gridsquare`
 * - `fields` 保留原字段
 *
 * 缺少必要字段（call 或 qso_date）时返回 null（该条被跳过）。
 */
export function adifRecordToLocal(record: AdifRecord, _index: number): LocalQso | null {
  const call = record.call?.trim().toUpperCase()
  if (!call) return null
  const timestamp = adifDateTimeToUnix(record.qso_date, record.time_on)
  if (timestamp === null) return null

  const id = `local-${record.qso_date ?? ''}-${record.time_on ?? ''}-${call}`

  return {
    id,
    timestamp,
    toCallsign: call,
    grid: record.gridsquare?.toUpperCase() ?? '',
    fields: { ...record }
  }
}

export interface ImportSummary {
  imported: LocalQso[]
  skipped: number
}

/**
 * 把一组 ADIF 记录批量转换为 LocalQso[]。
 * 缺少 call / qso_date 的被跳过并计数。
 */
export function adifRecordsToLocal(records: readonly AdifRecord[]): ImportSummary {
  const imported: LocalQso[] = []
  let skipped = 0
  for (let i = 0; i < records.length; i++) {
    const item = records[i]
    if (!item) {
      skipped++
      continue
    }
    const mapped = adifRecordToLocal(item, i)
    if (mapped) imported.push(mapped)
    else skipped++
  }
  return { imported, skipped }
}
