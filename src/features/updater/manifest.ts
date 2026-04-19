import type { LatestManifest } from './types'

export type ParseResult =
  | { ok: true; manifest: LatestManifest }
  | { ok: false; reason: string }

/**
 * 严格解析。任何缺字段 / 类型错都拒。
 * 调用方对拒绝一律视作"无新版",不抛错。
 */
export function parseManifest(input: unknown): ParseResult {
  if (!input || typeof input !== 'object') {
    return { ok: false, reason: 'not an object' }
  }
  const o = input as Record<string, unknown>

  const str = (k: string): string | null => (typeof o[k] === 'string' ? o[k] : null)
  const num = (k: string): number | null =>
    typeof o[k] === 'number' && Number.isFinite(o[k]) ? o[k] : null

  const version = str('version')
  if (!version) return { ok: false, reason: 'version missing or not string' }
  const url = str('url')
  if (!url) return { ok: false, reason: 'url missing or not string' }
  const sha256 = str('sha256')
  if (!sha256) return { ok: false, reason: 'sha256 missing or not string' }
  const size = num('size')
  if (size === null) return { ok: false, reason: 'size missing or not number' }
  const notes = str('notes')
  if (notes === null) return { ok: false, reason: 'notes missing or not string' }
  const publishedAt = str('publishedAt')
  if (!publishedAt) return { ok: false, reason: 'publishedAt missing or not string' }

  const minVersion =
    o.minVersion === null || o.minVersion === undefined
      ? null
      : typeof o.minVersion === 'string'
        ? o.minVersion
        : undefined

  if (minVersion === undefined) {
    return { ok: false, reason: 'minVersion wrong type' }
  }

  return {
    ok: true,
    manifest: { version, url, sha256, size, notes, publishedAt, minVersion }
  }
}
