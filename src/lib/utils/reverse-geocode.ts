/**
 * Maidenhead 网格 → 人类可读地名(反向地理编码)。
 *
 * 走自建服务 https://maidenmap.wh0am1i.com/ 的 `GET /api/grid` 接口,
 * 返回结构化的 country / admin1 / admin2 / city,中英文双语都有。
 *
 * 策略:
 * - 批量端点 `?codes=...`,微批窗口 50ms,单次最多 100 个,降请求数
 *   以应对 60 req/min/IP 的限流。
 * - localStorage 持久缓存(网格稳定,地名几乎不变);前缀 `fmodeck-geo2:`
 *   让旧的 Amap / BDC 字符串缓存自动失效。
 * - 400 invalid_grid 写 tombstone(永久无效);429 或网络错误返回 null
 *   且不写 tombstone,下次再试。
 *
 * 显示格式:`city - 一级行政区`(city 在前,admin1 / country 在后)。
 */

const ENDPOINT = 'https://maidenmap.wh0am1i.com/api/grid'
const CACHE_KEY_PREFIX = 'fmodeck-geo2:'
const BATCH_WINDOW_MS = 50
const BATCH_MAX = 100
const TOMBSTONE = '\u0001__MISS__'

type Lang = 'zh-CN' | 'en'

interface Bilingual {
  en?: string
  zh?: string
}

interface GridSuccess {
  grid: string
  center: { lat: number; lon: number }
  country: { code: string; name: Bilingual } | null
  admin1: Bilingual
  admin2: Bilingual
  city: Bilingual
}

interface GridError {
  grid: string
  error: string
  message?: string
}

type GridItem = GridSuccess | GridError

interface BatchResponse {
  results: GridItem[]
}

function isError(item: GridItem): item is GridError {
  return 'error' in item
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
    /* 配额满或禁用 localStorage:忽略 */
  }
}

/** 按语言从 bilingual 字段取非空值,互为 fallback。 */
function pick(b: Bilingual | undefined, lang: Lang): string {
  if (!b) return ''
  const primary = (lang === 'zh-CN' ? b.zh : b.en)?.trim()
  if (primary) return primary
  const fallback = (lang === 'zh-CN' ? b.en : b.zh)?.trim()
  return fallback ?? ''
}

/** HK / MO / TW — country.code 都被服务端重写成 CN,靠 admin1 名字识别。 */
function isHkMoTw(admin1: Bilingual): boolean {
  const en = admin1.en?.toLowerCase() ?? ''
  return (
    en.includes('hong kong') ||
    en.includes('macao') ||
    en.includes('macau') ||
    en.includes('taiwan')
  )
}

/**
 * 拼 "city - 一级行政区" 两段式。
 * - city 空时 fallback 到 admin2
 * - admin1 空时 fallback 到 country
 * - 两段相同则只返回一段
 * - HK / MO / TW 单独显示 "中国{admin1}"(en: "China {admin1}"),不带 city
 */
function formatItem(item: GridSuccess, lang: Lang): string | null {
  const admin1 = pick(item.admin1, lang)

  if (admin1 && item.country?.code === 'CN' && isHkMoTw(item.admin1)) {
    return (lang === 'zh-CN' ? '中国' : 'China ') + admin1
  }

  const city = pick(item.city, lang) || pick(item.admin2, lang)
  const country = item.country ? pick(item.country.name, lang) : ''
  const region = admin1 || country

  if (city && region && city !== region) return `${city} - ${region}`
  return city || region || null
}

// ---------- 微批调度 ----------

interface Pending {
  grid: string
  lang: Lang
  resolve: (v: string | null) => void
}

const queue: Pending[] = []
let flushTimer: ReturnType<typeof setTimeout> | null = null

function scheduleFlush(): void {
  if (flushTimer !== null) return
  flushTimer = setTimeout(() => {
    flushTimer = null
    const batch = queue.splice(0, BATCH_MAX)
    if (queue.length > 0) scheduleFlush()
    void flush(batch)
  }, BATCH_WINDOW_MS)
}

async function flush(batch: Pending[]): Promise<void> {
  if (batch.length === 0) return

  const uniqueGrids = Array.from(new Set(batch.map((b) => b.grid)))

  try {
    const url = new URL(ENDPOINT)
    url.searchParams.set('codes', uniqueGrids.join(','))
    const resp = await fetch(url.toString(), { headers: { Accept: 'application/json' } })

    if (resp.status === 429 || !resp.ok) {
      // 限流或其它失败:全部 null,不写缓存,下次再试
      for (const p of batch) p.resolve(null)
      return
    }

    const data = (await resp.json()) as BatchResponse
    const byGrid = new Map<string, GridItem>()
    for (const item of data.results ?? []) {
      byGrid.set(item.grid.toLowerCase(), item)
    }

    for (const p of batch) {
      const item = byGrid.get(p.grid.toLowerCase())
      if (!item) {
        p.resolve(null)
        continue
      }
      if (isError(item)) {
        // 格式非法等永久错误 → tombstone
        writeCache(p.grid, null)
        p.resolve(null)
        continue
      }
      const name = formatItem(item, p.lang)
      writeCache(p.grid, name)
      p.resolve(name)
    }
  } catch {
    for (const p of batch) p.resolve(null)
  }
}

function enqueue(grid: string, lang: Lang): Promise<string | null> {
  return new Promise((resolve) => {
    queue.push({ grid, lang, resolve })
    scheduleFlush()
  })
}

// ---------- 对外 API ----------

/**
 * 查询网格对应的地名。返回 null 表示找不到或查询失败。
 */
export async function reverseGeocodeGrid(
  grid: string,
  lang: Lang = 'zh-CN'
): Promise<string | null> {
  if (!grid) return null

  const cached = readCache(grid)
  if (cached !== undefined) return cached

  return enqueue(grid, lang)
}

/** 同步读缓存;用于组件首次渲染时优先显示缓存值。 */
export function readGeocodeCache(grid: string): string | null | undefined {
  if (!grid) return undefined
  return readCache(grid)
}
