import { describe, expect, it } from 'vitest'
import { parseAdif, type ParsedAdif } from './parser'
import { formatAdif } from './formatter'

function roundtrip(obj: ParsedAdif): ParsedAdif {
  return parseAdif(formatAdif(obj))
}

describe('ADIF 回环（parse ∘ format 幂等）', () => {
  it('纯英文记录', () => {
    const input: ParsedAdif = {
      records: [
        { call: 'BA0AX', mode: 'FM', freq: '144.640' },
        { call: 'BY4SDL', mode: 'DMR', freq: '430.100' }
      ]
    }
    expect(roundtrip(input)).toEqual(input)
  })

  it('中文字段回环', () => {
    const input: ParsedAdif = {
      records: [
        { call: 'BA0AX', app_fmo_comment_utf8: '你好世界' },
        { call: 'BY4SDL', app_fmo_comment_utf8: '测试中文备注字段 🚀' }
      ]
    }
    expect(roundtrip(input)).toEqual(input)
  })

  it('头部 + 记录回环', () => {
    const input: ParsedAdif = {
      header: { text: 'FmoDeck export', adif_ver: '3.1.0', programid: 'fmodeck' },
      records: [{ call: 'BA0AX', mode: 'FM' }]
    }
    expect(roundtrip(input)).toEqual(input)
  })

  it('边界字符：< > : 空格', () => {
    const input: ParsedAdif = {
      records: [{ comment: 'has spaces and < > and : in it' }]
    }
    expect(roundtrip(input)).toEqual(input)
  })
})
