import { describe, expect, it } from 'vitest'
import { parseAdif } from './parser'

describe('parseAdif · 基础结构', () => {
  it('空输入返回空对象', () => {
    expect(parseAdif('')).toEqual({})
  })

  it('仅头部（无记录）', () => {
    const input = 'ADIF Export\n<ADIF_VER:5>3.1.0<EOH>\n'
    const parsed = parseAdif(input)
    expect(parsed.header).toEqual({ text: 'ADIF Export', adif_ver: '3.1.0' })
    expect(parsed.records).toBeUndefined()
  })

  it('单条记录（无头部）', () => {
    const input = '<CALL:5>BA0AX<EOR>\n'
    const parsed = parseAdif(input)
    expect(parsed.records).toEqual([{ call: 'BA0AX' }])
  })

  it('多条记录', () => {
    const input = '<CALL:5>BA0AX<EOR>\n<CALL:6>BY4SDL<EOR>\n'
    const parsed = parseAdif(input)
    expect(parsed.records).toEqual([{ call: 'BA0AX' }, { call: 'BY4SDL' }])
  })

  it('标签名统一小写', () => {
    const input = '<Call:5>BA0AX<EoR>\n'
    expect(parseAdif(input).records).toEqual([{ call: 'BA0AX' }])
  })
})

describe('parseAdif · UTF-8 字节长度（中文）', () => {
  it('单字段中文（每字 3 字节）', () => {
    const input = '<COMMENT:6>测试<EOR>\n'
    expect(parseAdif(input).records).toEqual([{ comment: '测试' }])
  })

  it('混合中英文字段', () => {
    const input = '<CALL:5>BA0AX<COMMENT:12>BA0AX 你好<EOR>\n'
    expect(parseAdif(input).records).toEqual([{ call: 'BA0AX', comment: 'BA0AX 你好' }])
  })

  it('ArrayBuffer 输入（模拟文件读取）', () => {
    const bytes = new TextEncoder().encode('<CALL:5>BA0AX<EOR>\n')
    expect(parseAdif(bytes.buffer).records).toEqual([{ call: 'BA0AX' }])
  })

  it('Uint8Array 输入', () => {
    const bytes = new TextEncoder().encode('<CALL:5>BA0AX<EOR>\n')
    expect(parseAdif(bytes).records).toEqual([{ call: 'BA0AX' }])
  })
})

describe('parseAdif · 特殊情况', () => {
  it('APP_LoTW_EOF 终止解析', () => {
    const input = '<CALL:5>BA0AX<EOR>\n<APP_LoTW_EOF>\n'
    expect(parseAdif(input).records).toEqual([{ call: 'BA0AX' }])
  })

  it('字段类型提示（第三段）被忽略', () => {
    const input = '<CALL:5:S>BA0AX<EOR>\n'
    expect(parseAdif(input).records).toEqual([{ call: 'BA0AX' }])
  })

  it('缺少长度字段抛错', () => {
    expect(() => parseAdif('<CALL>BA0AX<EOR>\n')).toThrow(/enough parts/i)
  })

  it('非法长度抛错', () => {
    expect(() => parseAdif('<CALL:abc>BA0AX<EOR>\n')).toThrow(/width/i)
  })

  it('无效输入类型抛错', () => {
    // @ts-expect-error 故意传错类型
    expect(() => parseAdif(123)).toThrow(/Invalid input/)
  })
})
