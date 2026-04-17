/**
 * Maidenhead 网格定位符 ↔ 经纬度 转换。
 *
 * 格式（按精度递增）：
 * - 4 字符：字段 2 字母 + 方块 2 数字（如 `OM89`）—— 2° × 1° block
 * - 6 字符：再加 2 字母子方块（如 `OM89ij`）—— 5' × 2.5' block
 * - 8 字符：再加 2 数字扩展（如 `OM89ij11`）—— 30" × 15" block
 *
 * 约定：返回的 {lat, lng} 是方块的**中心点**（不是左下角），适合地图打点。
 *
 * 参考规范：IARU Region 1 Technical Recommendation R1/T2 (1985)。
 */

export interface LatLng {
  lat: number
  lng: number
}

/** 解析失败返回 null。 */
export function gridToLatLng(grid: string): LatLng | null {
  if (!grid) return null
  const g = grid.trim().toUpperCase()

  // 接受 4 / 6 / 8 字符
  if (![4, 6, 8].includes(g.length)) return null

  // 字段：A-R 每格 20°×10°（经度 × 纬度）
  const fieldLng = g.charCodeAt(0) - 65 // 'A' = 65
  const fieldLat = g.charCodeAt(1) - 65
  if (fieldLng < 0 || fieldLng >= 18 || fieldLat < 0 || fieldLat >= 18) return null

  // 方块：0-9 每格 2°×1°
  const sqLng = g.charCodeAt(2) - 48 // '0' = 48
  const sqLat = g.charCodeAt(3) - 48
  if (sqLng < 0 || sqLng > 9 || sqLat < 0 || sqLat > 9) return null

  // 基准：方块左下角
  let lng = fieldLng * 20 + sqLng * 2 - 180
  let lat = fieldLat * 10 + sqLat * 1 - 90

  // 默认精度：方块中心（+1°，+0.5°）
  let cellLng = 2
  let cellLat = 1

  if (g.length >= 6) {
    // 子方块：a-x 每格 5'×2.5'（即 1/12° × 1/24°）
    const subLng = g.charCodeAt(4) - 65 // 'A' = 65
    const subLat = g.charCodeAt(5) - 65
    if (subLng < 0 || subLng >= 24 || subLat < 0 || subLat >= 24) return null
    lng += subLng * (2 / 24)
    lat += subLat * (1 / 24)
    cellLng = 2 / 24
    cellLat = 1 / 24
  }

  if (g.length === 8) {
    // 扩展：0-9 每格 30"×15"
    const extLng = g.charCodeAt(6) - 48
    const extLat = g.charCodeAt(7) - 48
    if (extLng < 0 || extLng > 9 || extLat < 0 || extLat > 9) return null
    lng += extLng * (2 / 24 / 10)
    lat += extLat * (1 / 24 / 10)
    cellLng = 2 / 24 / 10
    cellLat = 1 / 24 / 10
  }

  // 中心点
  lng += cellLng / 2
  lat += cellLat / 2

  return { lat, lng }
}

/** 格式化为人类可读，如 `31.56°N, 112.02°E`。 */
export function formatLatLng(ll: LatLng, digits = 2): string {
  const latStr = `${Math.abs(ll.lat).toFixed(digits)}°${ll.lat >= 0 ? 'N' : 'S'}`
  const lngStr = `${Math.abs(ll.lng).toFixed(digits)}°${ll.lng >= 0 ? 'E' : 'W'}`
  return `${latStr}, ${lngStr}`
}

/** OpenStreetMap 外链（隐私友好 + 无需 API key）。 */
export function mapUrl(ll: LatLng, zoom = 10): string {
  return `https://www.openstreetmap.org/?mlat=${ll.lat.toFixed(5)}&mlon=${ll.lng.toFixed(5)}#map=${zoom}/${ll.lat.toFixed(4)}/${ll.lng.toFixed(4)}`
}
