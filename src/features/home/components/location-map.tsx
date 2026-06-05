import { useEffect, useRef } from 'react'
import L from 'leaflet'
import { wgs84ToGcj02 } from '@/lib/utils/geo-convert'
import type { LatLng } from '@/lib/utils/grid'

// 高德栅格瓦片（GCJ-02）。style=7 为标准路网图，无需 key。
const AMAP_TILE_URL =
  'https://wprd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&style=7&x={x}&y={y}&z={z}'

/**
 * 对方位置地图（纯展示）。props 为 WGS-84 坐标，内部转 GCJ-02 以对齐高德瓦片。
 * 用 circleMarker（无需 marker 图标资源，规避 Leaflet 默认图标打包问题）。
 */
export function LocationMap({ their, me }: { their: LatLng; me: LatLng | null }) {
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const map = L.map(el, { zoomControl: false, attributionControl: false })
    L.tileLayer(AMAP_TILE_URL, { subdomains: ['1', '2', '3', '4'], maxZoom: 18 }).addTo(map)

    const t = wgs84ToGcj02(their.lat, their.lng)
    const theirLL: L.LatLngTuple = [t.lat, t.lng]
    L.circleMarker(theirLL, {
      radius: 7,
      color: '#00D9FF',
      fillColor: '#00D9FF',
      fillOpacity: 0.9,
      weight: 2
    }).addTo(map)

    if (me) {
      const m = wgs84ToGcj02(me.lat, me.lng)
      const meLL: L.LatLngTuple = [m.lat, m.lng]
      L.circleMarker(meLL, {
        radius: 6,
        color: '#FFB000',
        fillColor: '#FFB000',
        fillOpacity: 0.9,
        weight: 2
      }).addTo(map)
      L.polyline([meLL, theirLL], {
        color: '#00D9FF',
        weight: 1.5,
        dashArray: '4 4',
        opacity: 0.7
      }).addTo(map)
      map.fitBounds(L.latLngBounds([meLL, theirLL]).pad(0.3))
    } else {
      map.setView(theirLL, 9)
    }

    return () => {
      map.remove()
    }
  }, [their.lat, their.lng, me])

  return <div ref={containerRef} data-testid="location-map" className="h-[480px] w-full" />
}
