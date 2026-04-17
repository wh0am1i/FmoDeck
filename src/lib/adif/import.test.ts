import { describe, expect, it } from 'vitest'
import { adifDateTimeToUnix, adifRecordToLocal, adifRecordsToLocal } from './import'

describe('adifDateTimeToUnix', () => {
  it('YYYYMMDD + HHMMSS → Unix 秒', () => {
    // 2026-04-17 12:34:56 UTC
    const ts = adifDateTimeToUnix('20260417', '123456')
    expect(ts).toBe(Math.floor(Date.UTC(2026, 3, 17, 12, 34, 56) / 1000))
  })

  it('YYYYMMDD + HHMM → Unix 秒（秒为 0）', () => {
    const ts = adifDateTimeToUnix('20260417', '1230')
    expect(ts).toBe(Math.floor(Date.UTC(2026, 3, 17, 12, 30, 0) / 1000))
  })

  it('YYYYMMDD 无 time_on → 当日 00:00 UTC', () => {
    const ts = adifDateTimeToUnix('20260417', undefined)
    expect(ts).toBe(Math.floor(Date.UTC(2026, 3, 17, 0, 0, 0) / 1000))
  })

  it('缺 qso_date 返回 null', () => {
    expect(adifDateTimeToUnix(undefined, '123456')).toBeNull()
    expect(adifDateTimeToUnix('', '123456')).toBeNull()
  })

  it('非法 qso_date 格式返回 null', () => {
    expect(adifDateTimeToUnix('2026-04-17', '1234')).toBeNull()
    expect(adifDateTimeToUnix('202604', '1234')).toBeNull()
    expect(adifDateTimeToUnix('abcdefgh', '1234')).toBeNull()
  })
})

describe('adifRecordToLocal', () => {
  it('映射 call/qso_date/time_on/gridsquare', () => {
    const local = adifRecordToLocal(
      {
        call: 'BA0AX',
        qso_date: '20260417',
        time_on: '123000',
        gridsquare: 'OM89',
        mode: 'FM'
      },
      0
    )
    expect(local).not.toBeNull()
    expect(local!.toCallsign).toBe('BA0AX')
    expect(local!.grid).toBe('OM89')
    expect(local!.fields.mode).toBe('FM')
    expect(local!.id).toMatch(/^local-20260417-123000-BA0AX-0$/)
  })

  it('call 被大写化 + trim', () => {
    const local = adifRecordToLocal({ call: '  ba0ax  ', qso_date: '20260417', time_on: '0000' }, 1)
    expect(local?.toCallsign).toBe('BA0AX')
  })

  it('缺 call 返回 null', () => {
    const local = adifRecordToLocal({ qso_date: '20260417', time_on: '1234' }, 0)
    expect(local).toBeNull()
  })

  it('缺 qso_date 返回 null', () => {
    const local = adifRecordToLocal({ call: 'BA0AX', time_on: '1234' }, 0)
    expect(local).toBeNull()
  })

  it('gridsquare 缺失时 grid 为空', () => {
    const local = adifRecordToLocal({ call: 'BA0AX', qso_date: '20260417', time_on: '0000' }, 0)
    expect(local?.grid).toBe('')
  })

  it('同条记录再次导入（index 相同）id 相同 → repo put 覆盖', () => {
    const a = adifRecordToLocal({ call: 'BA0AX', qso_date: '20260417', time_on: '1200' }, 3)
    const b = adifRecordToLocal({ call: 'BA0AX', qso_date: '20260417', time_on: '1200' }, 3)
    expect(a?.id).toBe(b?.id)
  })
})

describe('adifRecordsToLocal', () => {
  it('批量转换 + 跳过无效', () => {
    const { imported, skipped } = adifRecordsToLocal([
      { call: 'BA0AX', qso_date: '20260417', time_on: '1200' },
      { call: '', qso_date: '20260417' }, // 跳过：call 空
      { qso_date: '20260417' }, // 跳过：无 call
      { call: 'BY4SDL', qso_date: '20260416', time_on: '0800' }
    ])
    expect(imported).toHaveLength(2)
    expect(skipped).toBe(2)
    expect(imported[0]?.toCallsign).toBe('BA0AX')
    expect(imported[1]?.toCallsign).toBe('BY4SDL')
  })

  it('空数组返回空', () => {
    expect(adifRecordsToLocal([])).toEqual({ imported: [], skipped: 0 })
  })
})
