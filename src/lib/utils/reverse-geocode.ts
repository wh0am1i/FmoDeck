/**
 * Maidenhead 网格 → 人类可读地名（反向地理编码）。
 *
 * 首选高德（Amap）的 regeo 接口，地名与行政区划对中国地区最准。
 * 没有配置 Amap key 时回退到 BigDataCloud（免 key，海外覆盖更好）。
 *
 * 配置：
 *   `VITE_AMAP_KEY` —— 高德「Web 服务」类型的 key。需要在
 *   <https://console.amap.com/dev/key/app> 创建；.env.local 配置即可。
 *   Web 服务 key 没有 Referer 白名单限制，Tauri / web 都能直接用。
 *
 * 坐标说明：Maidenhead 输出的是 WGS-84，Amap 大陆范围内用 GCJ-02，偏移
 * 约 500m。Maidenhead 精度本身 ~10km，这个偏移可以忽略。
 *
 * 策略：
 * - localStorage 持久缓存（网格稳定，地名几乎不变）
 * - 失败 / 空结果也缓存（tombstone），避免反复重试
 * - Promise 链串行队列，保守 250ms / 次
 */

import { gridToLatLng } from './grid'

const CACHE_KEY_PREFIX = 'fmodeck-geo:'
const MIN_INTERVAL_MS = 250
const TOMBSTONE = '\u0001__MISS__'

let lastRequestAt = 0
let chain: Promise<void> = Promise.resolve()

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

// ---------- Amap (首选) ----------

interface AmapAddressComponent {
  country?: string
  province?: string | unknown[]
  city?: string | unknown[]
  district?: string | unknown[]
  township?: string | unknown[]
}

interface AmapRegeoResponse {
  status?: string
  info?: string
  regeocode?: {
    formatted_address?: string | unknown[]
    addressComponent?: AmapAddressComponent
  }
}

/** Amap 对「空」字段有时返回 `[]` 数组；只取字符串非空值。 */
function str(v: string | unknown[] | undefined): string | null {
  return typeof v === 'string' && v.length > 0 ? v : null
}

async function amapReverse(lat: number, lng: number, key: string): Promise<string | null> {
  const url = new URL('https://restapi.amap.com/v3/geocode/regeo')
  url.searchParams.set('key', key)
  url.searchParams.set('location', `${lng.toFixed(6)},${lat.toFixed(6)}`)
  url.searchParams.set('output', 'json')
  url.searchParams.set('extensions', 'base')

  const resp = await fetch(url.toString(), { headers: { Accept: 'application/json' } })
  if (!resp.ok) throw new Error(`amap ${resp.status}`)
  const data = (await resp.json()) as AmapRegeoResponse
  if (data.status !== '1') throw new Error(`amap status=${data.status} info=${data.info}`)

  const c = data.regeocode?.addressComponent
  if (!c) return str(data.regeocode?.formatted_address)

  // 只保留 市 / 省 两级；区县 / 街道等更细的层级略掉
  const city = str(c.city)
  const province = str(c.province)

  const parts: string[] = []
  if (city && city !== province) parts.push(city)
  if (province) parts.push(province)

  if (parts.length > 0) return parts.join(' - ')
  return str(data.regeocode?.formatted_address)
}

// ---------- BigDataCloud (回退) ----------

interface BdcResponse {
  city?: string
  locality?: string
  principalSubdivision?: string
  countryName?: string
}

async function bdcReverse(lat: number, lng: number, lang: string): Promise<string | null> {
  const url = new URL('https://api.bigdatacloud.net/data/reverse-geocode-client')
  url.searchParams.set('latitude', lat.toFixed(5))
  url.searchParams.set('longitude', lng.toFixed(5))
  url.searchParams.set('localityLanguage', lang.startsWith('zh') ? 'zh' : 'en')

  const resp = await fetch(url.toString(), { headers: { Accept: 'application/json' } })
  if (!resp.ok) throw new Error(`bdc ${resp.status}`)
  const data = (await resp.json()) as BdcResponse

  const locality = data.city ?? data.locality
  const parts: string[] = []
  if (locality) parts.push(locality)
  if (data.principalSubdivision && data.principalSubdivision !== locality) {
    parts.push(data.principalSubdivision)
  }
  return parts.length > 0 ? parts.join(' - ') : null
}

// ---------- 统一入口 ----------

async function resolve(lat: number, lng: number, lang: string): Promise<string | null> {
  const amapKey = import.meta.env.VITE_AMAP_KEY
  // Amap 只覆盖中文行政区划；英文语境下直接走 BDC，避免硬塞中文地名
  if (amapKey && lang.startsWith('zh')) {
    try {
      return await amapReverse(lat, lng, amapKey)
    } catch {
      // Amap 故障（额度耗尽 / key 失效 / 域名校验等）时自动退到 BDC
      return bdcReverse(lat, lng, lang)
    }
  }
  return bdcReverse(lat, lng, lang)
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
    const name = await enqueue(() => resolve(ll.lat, ll.lng, lang))
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
