import { formatAdif } from '@/lib/adif/formatter'
import type { ParsedAdif } from '@/lib/adif/parser'

/** 导出需要的最小字段形。QsoSummary / DisplayRow 皆兼容。 */
export interface ExportRow {
  timestamp: number
  toCallsign: string
  grid: string
}

function toAdifDate(unixSeconds: number): string {
  const d = new Date(unixSeconds * 1000)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`
}

function toAdifTime(unixSeconds: number): string {
  const d = new Date(unixSeconds * 1000)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}`
}

/**
 * 把 QsoSummary 列表转为 ADIF 字符串。
 *
 * 摘要只有 4 字段（logId/timestamp/toCallsign/grid），映射到 ADIF 标准字段：
 * - `call` ← toCallsign
 * - `gridsquare` ← grid
 * - `qso_date` + `time_on` ← timestamp（UTC）
 */
export function summariesToAdif(summaries: readonly ExportRow[]): string {
  const parsed: ParsedAdif = {
    header: {
      text: 'FmoDeck Export',
      adif_ver: '3.1.0',
      programid: 'fmodeck'
    },
    records: summaries.map((s) => ({
      call: s.toCallsign,
      gridsquare: s.grid,
      qso_date: toAdifDate(s.timestamp),
      time_on: toAdifTime(s.timestamp)
    }))
  }
  return formatAdif(parsed)
}

/**
 * 触发浏览器下载 ADIF 文件。
 */
export function downloadAdif(
  summaries: readonly ExportRow[],
  filename = 'fmodeck-export.adi'
): void {
  const adif = summariesToAdif(summaries)
  const blob = new Blob([adif], { type: 'application/octet-stream' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
