import { useEffect, useRef } from 'react'
import L from 'leaflet'
import { wgs84ToGcj02 } from '@/lib/utils/geo-convert'
import type { LatLng } from '@/lib/utils/grid'

// 高德栅格瓦片（GCJ-02）。style=7 为标准路网图，无需 key。
const AMAP_TILE_URL =
  'https://wprd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&style=7&x={x}&y={y}&z={z}'

/** 无任何坐标时的默认视角：中国全境。 */
const IDLE_CENTER: L.LatLngTuple = [35, 105]
const IDLE_ZOOM = 4

/**
 * 首页满屏底图。props 为 WGS-84，内部转 GCJ-02 对齐高德瓦片。
 * 地图实例常驻（只建一次）；target/me 变化只更新覆盖层与视角：
 * - target+me：双 marker + 虚线连线，fitBounds 带不对称 padding（避开左/右 HUD 浮层）
 * - 仅 target：单点居中 zoom 9（对方，或自己讲话时的自己）
 * - 仅 me：单点居中 zoom 7
 * - 都没有：idle 中国全境
 */
export function LocationMap({
  target,
  me,
  hold = false
}: {
  target: LatLng | null
  me: LatLng | null
  /** true=讲话者存在但无可解析坐标：照常重建覆盖层，但不改变视角。 */
  hold?: boolean
}) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const layersRef = useRef<L.LayerGroup | null>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const map = L.map(el, { zoomControl: false, attributionControl: false })
    L.tileLayer(AMAP_TILE_URL, { subdomains: ['1', '2', '3', '4'], maxZoom: 18 }).addTo(map)
    const layers = L.layerGroup().addTo(map)
    map.setView(IDLE_CENTER, IDLE_ZOOM)
    mapRef.current = map
    layersRef.current = layers

    // 容器尺寸变化（转屏 / 窗口缩放）时重算地图尺寸。jsdom 无 ResizeObserver，跳过。
    let ro: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => map.invalidateSize())
      ro.observe(el)
    }
    return () => {
      ro?.disconnect()
      mapRef.current = null
      layersRef.current = null
      map.remove()
    }
  }, [])

  const tLat = target?.lat ?? null
  const tLng = target?.lng ?? null
  const mLat = me?.lat ?? null
  const mLng = me?.lng ?? null

  useEffect(() => {
    const map = mapRef.current
    const layers = layersRef.current
    if (!map || !layers) return
    layers.clearLayers()

    let targetLL: L.LatLngTuple | null = null
    if (tLat !== null && tLng !== null) {
      const g = wgs84ToGcj02(tLat, tLng)
      targetLL = [g.lat, g.lng]
      L.circleMarker(targetLL, {
        radius: 7,
        color: '#00D9FF',
        fillColor: '#00D9FF',
        fillOpacity: 0.9,
        weight: 2
      }).addTo(layers)
    }

    let meLL: L.LatLngTuple | null = null
    if (mLat !== null && mLng !== null) {
      const g = wgs84ToGcj02(mLat, mLng)
      meLL = [g.lat, g.lng]
      L.circleMarker(meLL, {
        radius: 6,
        color: '#FFB000',
        fillColor: '#FFB000',
        fillOpacity: 0.9,
        weight: 2
      }).addTo(layers)
    }

    if (targetLL && meLL) {
      L.polyline([meLL, targetLL], {
        color: '#00D9FF',
        weight: 1.5,
        dashArray: '4 4',
        opacity: 0.7
      }).addTo(layers)
    }

    // hold：讲话者在但坐标解析不出 —— 覆盖层照常重建，视角保持不动
    if (!hold) {
      if (targetLL && meLL) {
        // 不对称 padding：左上 Hero 约占 36% 宽，右侧 QSO 流约占 26% 宽
        const w = containerRef.current?.clientWidth ?? 0
        map.fitBounds(L.latLngBounds([meLL, targetLL]), {
          paddingTopLeft: L.point(Math.round(w * 0.36), 96),
          paddingBottomRight: L.point(Math.round(w * 0.26), 96)
        })
      } else if (targetLL) {
        map.setView(targetLL, 9)
      } else if (meLL) {
        map.setView(meLL, 7)
      } else {
        map.setView(IDLE_CENTER, IDLE_ZOOM)
      }
    }
  }, [tLat, tLng, mLat, mLng, hold])

  return <div ref={containerRef} data-testid="location-map" className="hud-map absolute inset-0 z-0" />
}
