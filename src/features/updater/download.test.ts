import { describe, expect, it, vi } from 'vitest'
import { bufferToHex, downloadWithProgress, hashSha256 } from './download'

describe('bufferToHex', () => {
  it('encodes bytes to lowercase hex', () => {
    const bytes = new Uint8Array([0x00, 0x0f, 0xa1, 0xff])
    expect(bufferToHex(bytes)).toBe('000fa1ff')
  })
})

describe('hashSha256', () => {
  it('matches known vector', async () => {
    // "abc" → ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad
    const data = new TextEncoder().encode('abc')
    const hex = await hashSha256(data)
    expect(hex).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
  })
})

describe('downloadWithProgress', () => {
  it('concatenates chunks and reports progress', async () => {
    const chunks = [new Uint8Array([1, 2]), new Uint8Array([3, 4, 5])]
    const total = 5
    const reader = makeFakeReader(chunks)
    const progress = vi.fn()
    const out = await downloadWithProgress(reader, total, progress)
    expect(out).toEqual(new Uint8Array([1, 2, 3, 4, 5]))
    expect(progress).toHaveBeenCalledWith(0.4) // 2/5
    expect(progress).toHaveBeenCalledWith(1)   // 5/5
  })

  it('supports abort', async () => {
    const chunks = [new Uint8Array([1, 2, 3])]
    const reader = makeFakeReader(chunks)
    const ctl = new AbortController()
    ctl.abort()
    await expect(downloadWithProgress(reader, 3, () => {}, ctl.signal)).rejects.toThrow(/abort/i)
  })
})

function makeFakeReader(chunks: Uint8Array[]): ReadableStreamDefaultReader<Uint8Array> {
  let i = 0
  return {
    async read() {
      if (i >= chunks.length) return { done: true, value: undefined as unknown as Uint8Array }
      return { done: false, value: chunks[i++] }
    },
    releaseLock() {},
    cancel: async () => {},
    closed: Promise.resolve(undefined)
  } as unknown as ReadableStreamDefaultReader<Uint8Array>
}
