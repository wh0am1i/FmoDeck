import { describe, expect, it } from 'vitest'
import { wgs84ToGcj02 } from './geo-convert'

describe('wgs84ToGcj02', () => {
  it('中国境内坐标偏移到 GCJ-02（天安门量级）', () => {
    const r = wgs84ToGcj02(39.90874, 116.3975)
    expect(r.lat).toBeGreaterThan(39.909)
    expect(r.lat).toBeLessThan(39.914)
    expect(r.lng).toBeGreaterThan(116.402)
    expect(r.lng).toBeLessThan(116.408)
  })

  it('境外坐标原样返回（不偏移）', () => {
    const r = wgs84ToGcj02(35.6586, 139.7454)
    expect(r.lat).toBe(35.6586)
    expect(r.lng).toBe(139.7454)
  })

  it('返回 {lat,lng} 结构', () => {
    const r = wgs84ToGcj02(31.23, 121.47)
    expect(typeof r.lat).toBe('number')
    expect(typeof r.lng).toBe('number')
  })
})
