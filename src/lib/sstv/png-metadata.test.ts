import { describe, expect, it } from 'vitest'
import { injectPngText, injectPngTextBytes } from './png-metadata'

/**
 * 最小合法 PNG: 1×1 透明像素。结构:签名 + IHDR + IDAT + IEND。
 * 用 base64 提供,避免重新实现 zlib。
 */
const TINY_PNG_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNgAAIAAAUAAarVyFEAAAAASUVORK5CYII='

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

describe('injectPngTextBytes', () => {
  it('插入 tEXt 后字节增加,签名 + IHDR 完整', () => {
    const orig = b64ToBytes(TINY_PNG_B64)
    const out = injectPngTextBytes(orig, { SSTVMode: 'robot36' })
    expect(out.length).toBeGreaterThan(orig.length)
    expect(Array.from(out.subarray(0, 8))).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    let foundAt = -1
    for (let i = 0; i + 4 <= out.length; i++) {
      if (
        out[i] === 0x74 &&
        out[i + 1] === 0x45 &&
        out[i + 2] === 0x58 &&
        out[i + 3] === 0x74
      ) {
        foundAt = i
        break
      }
    }
    expect(foundAt).toBeGreaterThan(0)
    const kwStart = foundAt + 4
    const kw = String.fromCharCode(...out.subarray(kwStart, kwStart + 8))
    expect(kw).toBe('SSTVMode')
    expect(out[kwStart + 8]).toBe(0)
    const text = String.fromCharCode(...out.subarray(kwStart + 9, kwStart + 9 + 7))
    expect(text).toBe('robot36')
  })

  it('非 PNG 输入直接原样返回', () => {
    const fake = new Uint8Array([1, 2, 3, 4])
    const out = injectPngTextBytes(fake, { SSTVMode: 'robot36' })
    expect(out).toBe(fake)
  })

  it('keyword 为空 / 过长抛错', () => {
    const orig = b64ToBytes(TINY_PNG_B64)
    expect(() => injectPngTextBytes(orig, { '': 'x' })).toThrow(/keyword/)
    expect(() => injectPngTextBytes(orig, { ['a'.repeat(80)]: 'x' })).toThrow(/keyword/)
  })
})

describe('injectPngText (Blob wrapper)', () => {
  it('返回 Blob 类型为 image/png', async () => {
    const orig = new Blob([b64ToBytes(TINY_PNG_B64)], { type: 'image/png' })
    const out = await injectPngText(orig, { SSTVMode: 'robot36' })
    expect(out.type).toBe('image/png')
  })
})
