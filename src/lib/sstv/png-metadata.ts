// src/lib/sstv/png-metadata.ts

/**
 * 在已有 PNG Blob 里插入一个 tEXt chunk。
 *
 * PNG 结构: 8B 签名 + 一系列 chunk(每个 chunk = length(4) + type(4) + data + crc(4))。
 * 我们在第一个 chunk(IHDR)之后插入 tEXt,避开 IDAT 顺序约束。
 *
 * tEXt chunk:
 *   data = `${keyword}\0${text}` (Latin-1)
 *   crc = CRC-32 over type + data
 *
 * 参考: https://www.w3.org/TR/PNG/#11tEXt
 */
/**
 * 在 PNG 字节里插入 tEXt chunk,返回新字节。bytes 不是合法 PNG 时原样返回。
 */
export function injectPngTextBytes(bytes: Uint8Array, entries: Record<string, string>): Uint8Array {
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
  for (let i = 0; i < 8; i++) {
    if (bytes[i] !== sig[i]) return bytes
  }
  const ihdrEnd = 8 + 4 + 4 + 13 + 4
  if (bytes.length < ihdrEnd) return bytes

  // 校验 keyword,空 / 过长直接抛(防止生成非法 PNG)
  const chunks: Uint8Array[] = []
  for (const [keyword, value] of Object.entries(entries)) {
    chunks.push(buildTextChunk(keyword, value))
  }

  const head = bytes.subarray(0, ihdrEnd)
  const tail = bytes.subarray(ihdrEnd)
  const totalLen = head.length + chunks.reduce((s, c) => s + c.length, 0) + tail.length
  const out = new Uint8Array(totalLen)
  out.set(head, 0)
  let off = head.length
  for (const c of chunks) {
    out.set(c, off)
    off += c.length
  }
  out.set(tail, off)
  return out
}

export async function injectPngText(blob: Blob, entries: Record<string, string>): Promise<Blob> {
  const ab =
    typeof blob.arrayBuffer === 'function'
      ? await blob.arrayBuffer()
      : await new Response(blob).arrayBuffer()
  const out = injectPngTextBytes(new Uint8Array(ab), entries)
  // Cast: TS 5.9 lib 把 Uint8Array 默认泛型从 ArrayBuffer 放宽到 ArrayBufferLike
  // (含 SharedArrayBuffer),BlobPart 仍要求 ArrayBuffer。运行期 Uint8Array
  // 始终是合法 BlobPart,这里只为绕过类型收紧。
  return new Blob([out as BlobPart], { type: 'image/png' })
}

function buildTextChunk(keyword: string, text: string): Uint8Array {
  // Latin-1 编码:取低 8 位即可
  const kw = encodeLatin1(keyword)
  const txt = encodeLatin1(text)
  if (kw.length === 0 || kw.length > 79) {
    throw new Error(`tEXt keyword must be 1-79 chars, got ${kw.length}`)
  }
  const data = new Uint8Array(kw.length + 1 + txt.length)
  data.set(kw, 0)
  data[kw.length] = 0
  data.set(txt, kw.length + 1)

  const type = new Uint8Array([0x74, 0x45, 0x58, 0x74]) // 'tEXt'
  const lengthBytes = u32be(data.length)
  const crcInput = new Uint8Array(type.length + data.length)
  crcInput.set(type, 0)
  crcInput.set(data, type.length)
  const crcBytes = u32be(crc32(crcInput))

  const chunk = new Uint8Array(4 + 4 + data.length + 4)
  chunk.set(lengthBytes, 0)
  chunk.set(type, 4)
  chunk.set(data, 8)
  chunk.set(crcBytes, 8 + data.length)
  return chunk
}

function encodeLatin1(s: string): Uint8Array {
  const out = new Uint8Array(s.length)
  for (let i = 0; i < s.length; i++) {
    out[i] = s.charCodeAt(i) & 0xff
  }
  return out
}

function u32be(n: number): Uint8Array {
  return new Uint8Array([(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff])
}

const CRC_TABLE: Uint32Array = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    t[n] = c >>> 0
  }
  return t
})()

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff
  for (const b of bytes) {
    c = (CRC_TABLE[(c ^ b) & 0xff]! ^ (c >>> 8)) >>> 0
  }
  return (c ^ 0xffffffff) >>> 0
}
