import type { FmoApiClient } from '@/lib/fmo-api/client'
import type { LatLng } from '@/lib/utils/grid'

/**
 * FMO 设备配置服务。目前仅用到坐标读取。
 * 注意设备 API 拼写为 `getCordinate`（少一个 o），非笔误。
 */
export class ConfigService {
  constructor(private readonly api: FmoApiClient) {}

  /**
   * 读取设备坐标。失败 / 未设 / 越界一律返回 null（位置为可选特性，不抛错）。
   */
  async getCoordinate(): Promise<LatLng | null> {
    const resp = await this.api.send({ type: 'config', subType: 'getCordinate' })
    if (resp.code !== 0) return null
    const d = resp.data as { latitude?: unknown; longitude?: unknown }
    const lat = typeof d?.latitude === 'number' ? d.latitude : NaN
    const lng = typeof d?.longitude === 'number' ? d.longitude : NaN
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null
    if (lat === 0 && lng === 0) return null
    return { lat, lng }
  }
}
