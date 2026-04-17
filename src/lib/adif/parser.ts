export interface AdifHeader {
  text?: string
  [tagName: string]: string | undefined
}

export type AdifRecord = Record<string, string>

export interface ParsedAdif {
  header?: AdifHeader
  records?: AdifRecord[]
}

type AdifInput = string | ArrayBuffer | Uint8Array

const BYTE_LT = 60
const BYTE_GT = 62

class AdifParserImpl {
  private readonly bytes: Uint8Array
  private readonly decoder = new TextDecoder('utf-8')
  private cursor = 0

  constructor(bytes: Uint8Array) {
    this.bytes = bytes
  }

  parse(): ParsedAdif {
    const parsed: ParsedAdif = {}
    if (this.bytes.length === 0) return parsed

    if (this.bytes[0] !== BYTE_LT) {
      const header: AdifHeader = { text: this.parseHeaderText() }
      while (this.cursor < this.bytes.length) {
        if (this.parseTagValue(header)) break
      }
      parsed.header = header
    }

    const records: AdifRecord[] = []
    while (this.cursor < this.bytes.length) {
      const record: AdifRecord = {}
      let ended = false
      while (this.cursor < this.bytes.length) {
        if (this.parseTagValue(record)) {
          ended = true
          break
        }
      }
      if (Object.keys(record).length > 0) records.push(record)
      if (!ended) break
    }

    if (records.length > 0) parsed.records = records
    return parsed
  }

  private parseHeaderText(): string {
    const start = this.findByte(BYTE_LT, this.cursor)
    const end = start === -1 ? this.bytes.length : start
    const text = this.decoder.decode(this.bytes.slice(this.cursor, end)).trim()
    this.cursor = end
    return text
  }

  private parseTagValue(target: Record<string, string | undefined>): boolean {
    const startTag = this.findByte(BYTE_LT, this.cursor)
    if (startTag === -1) {
      this.cursor = this.bytes.length
      return true
    }
    const endTag = this.findByte(BYTE_GT, startTag)
    if (endTag === -1) {
      this.cursor = this.bytes.length
      return true
    }

    const tagContent = this.decoder.decode(this.bytes.slice(startTag + 1, endTag))
    const parts = tagContent.split(':')
    const tagName = parts[0]!.toLowerCase()

    if (tagName === 'eor' || tagName === 'eoh') {
      this.cursor = endTag + 1
      return true
    }
    if (tagContent === 'APP_LoTW_EOF') {
      this.cursor = this.bytes.length
      return true
    }

    if (parts.length < 2) {
      throw new Error(
        `Encountered field tag without enough parts near byte ${startTag}: ${tagContent.slice(0, 80)}`
      )
    }

    const width = Number.parseInt(parts[1]!, 10)
    if (Number.isNaN(width)) {
      throw new Error(`Invalid field width near byte ${startTag}: ${tagContent}`)
    }

    const valueStart = endTag + 1
    const value = this.decoder.decode(this.bytes.slice(valueStart, valueStart + width))
    target[tagName] = value
    this.cursor = valueStart + width
    return false
  }

  private findByte(byte: number, start: number): number {
    for (let i = start; i < this.bytes.length; i++) {
      if (this.bytes[i] === byte) return i
    }
    return -1
  }
}

function toBytes(input: AdifInput): Uint8Array {
  if (typeof input === 'string') return new TextEncoder().encode(input)
  // 结构化检查（避免跨 realm 的 instanceof 失效）
  if (ArrayBuffer.isView(input)) {
    const view = input as ArrayBufferView
    return new Uint8Array(view.buffer, view.byteOffset, view.byteLength)
  }
  if (input && typeof input.byteLength === 'number') {
    return new Uint8Array(input)
  }
  throw new Error('Invalid input: expected string | ArrayBuffer | Uint8Array')
}

export function parseAdif(input: AdifInput): ParsedAdif {
  return new AdifParserImpl(toBytes(input)).parse()
}
