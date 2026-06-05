import { describe, expect, it } from 'vitest'
import { cardinal8, bearingDeg, formatLatLng, gridToLatLng, haversineKm, mapUrl } from './grid'

describe('gridToLatLng', () => {
  it('4 字符 OM89 解为方块中心（北京附近）', () => {
    const ll = gridToLatLng('OM89')
    expect(ll).not.toBeNull()
    // OM89 = 东经 [116, 118) / 北纬 [39, 40)，中心 117°E / 39.5°N
    expect(ll!.lng).toBeCloseTo(117, 1)
    expect(ll!.lat).toBeCloseTo(39.5, 1)
  })

  it('6 字符 OM89ij 子方块中心更精确', () => {
    const coarse = gridToLatLng('OM89')!
    const fine = gridToLatLng('OM89ij')!
    expect(fine).not.toEqual(coarse)
    // 子方块应落在父方块范围内
    expect(fine.lng).toBeGreaterThanOrEqual(116)
    expect(fine.lng).toBeLessThan(118)
    expect(fine.lat).toBeGreaterThanOrEqual(39)
    expect(fine.lat).toBeLessThan(40)
  })

  it('8 字符扩展精度', () => {
    const ll = gridToLatLng('OM89ij11')
    expect(ll).not.toBeNull()
    expect(ll!.lng).toBeGreaterThan(116)
    expect(ll!.lng).toBeLessThan(118)
  })

  it('经典样本 JN58 (慕尼黑附近)', () => {
    const ll = gridToLatLng('JN58')!
    expect(ll.lng).toBeCloseTo(11, 0)
    expect(ll.lat).toBeCloseTo(48.5, 1)
  })

  it('经典样本 FN31 (纽约附近)', () => {
    const ll = gridToLatLng('FN31')!
    expect(ll.lng).toBeCloseTo(-73, 0)
    expect(ll.lat).toBeCloseTo(41.5, 1)
  })

  it('经典样本 RE78 (新西兰附近)', () => {
    const ll = gridToLatLng('RE78')!
    expect(ll.lat).toBeLessThan(0) // 南半球
    expect(ll.lng).toBeCloseTo(175, 0)
    expect(ll.lat).toBeCloseTo(-41.5, 1)
  })

  it('小写也能解析（内部大写化）', () => {
    const a = gridToLatLng('om89')
    const b = gridToLatLng('OM89')
    expect(a).toEqual(b)
  })

  it('长度不是 4/6/8 → null', () => {
    expect(gridToLatLng('OM')).toBeNull()
    expect(gridToLatLng('OM8')).toBeNull()
    expect(gridToLatLng('OM89i')).toBeNull()
    expect(gridToLatLng('OM89ij1')).toBeNull()
  })

  it('非法字符 → null', () => {
    expect(gridToLatLng('ZZ99')).toBeNull() // Z 超出 A-R
  })

  it('极限边界：AA00 在地球西南角', () => {
    // AA00 = 从 -180 经度 / -90 纬度起的第一个方块，中心 -179°E, -89.5°N
    expect(gridToLatLng('AA00')!).toEqual({ lat: -89.5, lng: -179 })
  })

  it('空串 → null', () => {
    expect(gridToLatLng('')).toBeNull()
  })
})

describe('formatLatLng', () => {
  it('北纬东经', () => {
    expect(formatLatLng({ lat: 31.56, lng: 112.02 })).toBe('31.56°N, 112.02°E')
  })

  it('南纬西经', () => {
    expect(formatLatLng({ lat: -33.87, lng: -151.21 })).toBe('33.87°S, 151.21°W')
  })

  it('精度参数', () => {
    expect(formatLatLng({ lat: 1.234567, lng: 2.345678 }, 4)).toBe('1.2346°N, 2.3457°E')
  })
})

describe('mapUrl', () => {
  it('生成 MaidenMap 链接', () => {
    const url = mapUrl('OM89bn')
    expect(url).toBe('https://maidenmap.wh0am1i.com/?grid=OM89bn')
  })
})

describe('haversineKm', () => {
  it('同点距离为 0', () => {
    expect(haversineKm({ lat: 0, lng: 0 }, { lat: 0, lng: 0 })).toBe(0)
  })
  it('赤道上经度差 1° ≈ 111.19 km', () => {
    const d = haversineKm({ lat: 0, lng: 0 }, { lat: 0, lng: 1 })
    expect(d).toBeGreaterThan(110.5)
    expect(d).toBeLessThan(111.9)
  })
  it('纬度差 1° ≈ 111.19 km', () => {
    const d = haversineKm({ lat: 0, lng: 0 }, { lat: 1, lng: 0 })
    expect(d).toBeGreaterThan(110.5)
    expect(d).toBeLessThan(111.9)
  })
})

describe('bearingDeg', () => {
  const o = { lat: 0, lng: 0 }
  it('正北 ≈ 0°', () => {
    expect(bearingDeg(o, { lat: 1, lng: 0 })).toBeCloseTo(0, 1)
  })
  it('正东 ≈ 90°', () => {
    expect(bearingDeg(o, { lat: 0, lng: 1 })).toBeCloseTo(90, 1)
  })
  it('正南 ≈ 180°', () => {
    expect(bearingDeg(o, { lat: -1, lng: 0 })).toBeCloseTo(180, 1)
  })
  it('正西 ≈ 270°', () => {
    expect(bearingDeg(o, { lat: 0, lng: -1 })).toBeCloseTo(270, 1)
  })
})

describe('cardinal8', () => {
  it('映射八方位边界', () => {
    expect(cardinal8(0)).toBe('N')
    expect(cardinal8(45)).toBe('NE')
    expect(cardinal8(90)).toBe('E')
    expect(cardinal8(135)).toBe('SE')
    expect(cardinal8(180)).toBe('S')
    expect(cardinal8(225)).toBe('SW')
    expect(cardinal8(270)).toBe('W')
    expect(cardinal8(315)).toBe('NW')
    expect(cardinal8(359)).toBe('N')
  })
})
