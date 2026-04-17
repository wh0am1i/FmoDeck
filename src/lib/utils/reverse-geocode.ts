/**
 * Maidenhead 网格 → 人类可读地名（反向地理编码）。
 *
 * 用 OpenStreetMap Nominatim 免费服务（无需 API key）。
 * 限制：
 * - 1 次请求 / 秒（Nominatim 使用条款要求）
 * - 全部请求走客户端浏览器（每个用户自己的 IP 配额，不会互相拖累）
 *
 * 策略：
 * - 结果 localStorage 持久缓存（网格是稳定的，地名更新也慢）
 * - 失败 / 空结果同样缓存（避免反复重试）
 * - 用 Promise 链做串行队列，保证 1/秒 的节奏
 */

import { gridToLatLng } from './grid'

const CACHE_KEY_PREFIX = 'fmodeck-geo:'
const MIN_INTERVAL_MS = 1100 // 留一点 buffer，避免边界命中 429
const TOMBSTONE = '\u0001__MISS__' // 代表"查过但无结果"的占位值，和正常地名区分

let lastRequestAt = 0
let chain: Promise<void> = Promise.resolve()

interface NominatimAddress {
  city?: string
  town?: string
  village?: string
  hamlet?: string
  suburb?: string
  county?: string
  state?: string
  country?: string
}

interface NominatimResponse {
  address?: NominatimAddress
  display_name?: string
}

function cacheKey(grid: string): string {
  return CACHE_KEY_PREFIX + grid.toLowerCase()
}

function readCache(grid: string): string | null | undefined {
  try {
    const v = window.localStorage.getItem(cacheKey(grid))
    if (v === null) return undefined
    if (v === TOMBSTONE) return null
    return v
  } catch {
    return undefined
  }
}

function writeCache(grid: string, value: string | null): void {
  try {
    window.localStorage.setItem(cacheKey(grid), value ?? TOMBSTONE)
  } catch {
    /* 配额满或禁用 localStorage：忽略 */
  }
}

function pickName(addr: NominatimAddress): string | null {
  const locality = addr.city ?? addr.town ?? addr.village ?? addr.hamlet ?? addr.suburb ?? addr.county
  const parts: string[] = []
  if (locality) parts.push(locality)
  if (addr.state && addr.state !== locality) parts.push(addr.state)
  if (addr.country) parts.push(addr.country)
  return parts.length > 0 ? parts.join(', ') : null
}

async function nominatim(lat: number, lng: number, lang: string): Promise<string | null> {
  const url = new URL('https://nominatim.openstreetmap.org/reverse')
  url.searchParams.set('lat', lat.toFixed(5))
  url.searchParams.set('lon', lng.toFixed(5))
  url.searchParams.set('format', 'jsonv2')
  url.searchParams.set('zoom', '10')
  url.searchParams.set('accept-language', lang)

  const resp = await fetch(url.toString(), {
    headers: { Accept: 'application/json' }
  })
  if (!resp.ok) throw new Error(`nominatim ${resp.status}`)
  const data = (await resp.json()) as NominatimResponse

  if (data.address) {
    const name = pickName(data.address)
    if (name) return name
  }
  return data.display_name ?? null
}

function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const task = chain.then(async () => {
    const now = Date.now()
    const wait = Math.max(0, lastRequestAt + MIN_INTERVAL_MS - now)
    if (wait > 0) await new Promise((r) => setTimeout(r, wait))
    lastRequestAt = Date.now()
    return fn()
  })
  chain = task.then(
    () => undefined,
    () => undefined
  )
  return task
}

/**
 * 查询网格对应的地名。返回 null 表示找不到或查询失败。
 */
export async function reverseGeocodeGrid(
  grid: string,
  lang: 'zh-CN' | 'en' = 'zh-CN'
): Promise<string | null> {
  if (!grid) return null

  const cached = readCache(grid)
  if (cached !== undefined) return cached

  const ll = gridToLatLng(grid)
  if (!ll) return null

  try {
    const name = await enqueue(() => nominatim(ll.lat, ll.lng, lang))
    writeCache(grid, name)
    return name
  } catch {
    // 失败不缓存 tombstone（下次可重试）
    return null
  }
}

/** 同步读缓存；用于组件首次渲染时优先显示缓存值。 */
export function readGeocodeCache(grid: string): string | null | undefined {
  if (!grid) return undefined
  return readCache(grid)
}
