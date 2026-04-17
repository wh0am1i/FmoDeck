import { describe, expect, it } from 'vitest'
import { parseAdif } from '@/lib/adif/parser'
import { summariesToAdif } from './export'
import type { QsoSummary } from '@/types/qso'

function makeSummary(overrides: Partial<QsoSummary> = {}): QsoSummary {
  return {
    logId: 1,
    timestamp: 1776358502, // 2026-04-11 02:15:02 UTC
    toCallsign: 'BI2RCY',
    grid: 'PN11rr',
    ...overrides
  }
}

describe('summariesToAdif', () => {
  it('生成带 header 和 records 的 ADIF', () => {
    const out = summariesToAdif([makeSummary()])
    expect(out).toContain('<ADIF_VER:5>3.1.0')
    expect(out).toContain('<EOH>')
    expect(out).toContain('<CALL:6>BI2RCY')
    expect(out).toContain('<GRIDSQUARE:6>PN11rr')
    expect(out).toContain('<EOR>')
  })

  it('qso_date / time_on 按 UTC 格式化', () => {
    // 1776358502 seconds = 2026-04-16 16:55:02 UTC
    const out = summariesToAdif([makeSummary({ timestamp: 1776358502 })])
    expect(out).toContain('<QSO_DATE:8>20260416')
    expect(out).toContain('<TIME_ON:6>165502')
  })

  it('回环：parseAdif 能重新读回生成的内容', () => {
    const input: QsoSummary[] = [
      makeSummary({ logId: 1, toCallsign: 'BA0AX', grid: 'OM89' }),
      makeSummary({ logId: 2, toCallsign: 'BY4SDL', grid: 'OM77' })
    ]
    const parsed = parseAdif(summariesToAdif(input))
    expect(parsed.records).toHaveLength(2)
    expect(parsed.records?.[0]?.call).toBe('BA0AX')
    expect(parsed.records?.[1]?.call).toBe('BY4SDL')
    expect(parsed.header?.adif_ver).toBe('3.1.0')
  })

  it('空列表仍产出合法 ADIF（只含 header）', () => {
    const out = summariesToAdif([])
    expect(out).toContain('<EOH>')
    expect(out).not.toContain('<EOR>')
  })
})
