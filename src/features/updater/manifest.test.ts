import { describe, expect, it } from 'vitest'
import { parseManifest } from './manifest'

const VALID = {
  version: '0.1.6',
  url: 'https://x/fmodeck/android/FmoDeck_0.1.6_android.apk',
  sha256: 'a'.repeat(64),
  size: 12345,
  notes: 'changelog',
  publishedAt: '2026-04-19T12:00:00Z'
}

describe('parseManifest', () => {
  it('accepts valid manifest', () => {
    const r = parseManifest(VALID)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.manifest.version).toBe('0.1.6')
  })

  it('rejects non-object', () => {
    expect(parseManifest(null).ok).toBe(false)
    expect(parseManifest('abc').ok).toBe(false)
    expect(parseManifest(42).ok).toBe(false)
  })

  it('rejects missing field', () => {
    for (const k of ['version', 'url', 'sha256', 'size', 'notes', 'publishedAt']) {
      const copy = { ...VALID } as Record<string, unknown>
      delete copy[k]
      const r = parseManifest(copy)
      expect(r.ok).toBe(false)
      if (!r.ok) expect(r.reason).toContain(k)
    }
  })

  it('rejects wrong type', () => {
    expect(parseManifest({ ...VALID, size: '1024' }).ok).toBe(false)
    expect(parseManifest({ ...VALID, version: 123 }).ok).toBe(false)
  })

  it('accepts minVersion null/undefined/string', () => {
    expect(parseManifest({ ...VALID, minVersion: null }).ok).toBe(true)
    expect(parseManifest({ ...VALID, minVersion: '0.1.0' }).ok).toBe(true)
    expect(parseManifest({ ...VALID, minVersion: undefined }).ok).toBe(true)
  })
})
