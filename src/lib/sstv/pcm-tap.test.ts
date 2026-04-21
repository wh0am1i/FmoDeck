// src/lib/sstv/pcm-tap.test.ts
import { describe, it, expect } from 'vitest'
import { PcmTap } from './pcm-tap'

function fillChunk(n: number, offset = 0): Float32Array {
  const a = new Float32Array(n)
  for (let i = 0; i < n; i++) a[i] = offset + i
  return a
}

describe('PcmTap', () => {
  it('写入后 slice 能原样取回', () => {
    const tap = new PcmTap(1024)
    tap.write(fillChunk(100, 0))
    const got = tap.slice(0, 100)
    expect(got).not.toBeNull()
    for (let i = 0; i < 100; i++) expect(got![i]).toBe(i)
  })

  it('slice 越过 totalWritten 返回 null', () => {
    const tap = new PcmTap(1024)
    tap.write(fillChunk(100))
    expect(tap.slice(50, 200)).toBeNull()
  })

  it('slice 指向已被覆盖的样本返回 null', () => {
    const tap = new PcmTap(16)
    tap.write(fillChunk(32, 0))
    expect(tap.slice(0, 10)).toBeNull()
    const got = tap.slice(16, 10)
    expect(got).not.toBeNull()
    expect(got![0]).toBe(16)
    expect(got![9]).toBe(25)
  })

  it('totalWritten 准确', () => {
    const tap = new PcmTap(32)
    tap.write(fillChunk(10))
    expect(tap.totalWritten).toBe(10)
    tap.write(fillChunk(50))
    expect(tap.totalWritten).toBe(60)
  })

  it('recent(durationMs, sampleRate) 返回末尾对应样本', () => {
    const tap = new PcmTap(1024)
    tap.write(fillChunk(480))
    const r = tap.recent(5, 48000)
    expect(r.length).toBe(240)
    expect(r[0]).toBe(240)
    expect(r[239]).toBe(479)
  })
})
