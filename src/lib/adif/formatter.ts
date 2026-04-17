import type { ParsedAdif } from './parser'

const encoder = new TextEncoder()

function byteLen(value: string): number {
  return encoder.encode(value).byteLength
}

function formatFields(obj: Record<string, string | undefined>, separator: string): string {
  let buf = ''
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue
    buf += `<${key.toUpperCase()}:${byteLen(value)}>${value}${separator}`
  }
  return buf
}

export function formatAdif(obj: ParsedAdif): string {
  let buf = ''

  if (obj.header !== undefined) {
    const { text, ...fields } = obj.header
    if (text) buf += `${text}\n`
    buf += formatFields(fields, '\n')
    buf += '<EOH>\n'
  }

  if (obj.records !== undefined) {
    for (const rec of obj.records) {
      buf += formatFields(rec, ' ')
      buf += '<EOR>\n'
    }
  }

  const trimmed = buf.trim()
  return trimmed.length === 0 ? '' : `${trimmed}\n`
}
