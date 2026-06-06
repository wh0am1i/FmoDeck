import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('leaflet', () => {
  const chainable: Record<string, unknown> = {}
  const ret = () => chainable
  Object.assign(chainable, {
    addTo: ret,
    setView: ret,
    fitBounds: ret,
    remove: ret,
    pad: ret,
    clearLayers: ret,
    invalidateSize: ret
  })
  return {
    default: {
      map: ret,
      tileLayer: ret,
      circleMarker: ret,
      polyline: ret,
      latLngBounds: ret,
      layerGroup: ret,
      point: ret
    }
  }
})

import { LocationMap } from '../components/location-map'

describe('LocationMap v3', () => {
  it('满屏容器渲染，带 hud-map 深色滤镜钩子类', () => {
    render(<LocationMap target={{ lat: 34.6, lng: 112.4 }} me={{ lat: 36, lng: 103.8 }} />)
    const el = screen.getByTestId('location-map')
    expect(el).toBeInTheDocument()
    expect(el.className).toContain('hud-map')
  })

  it('无我方坐标也渲染（仅标对方）', () => {
    render(<LocationMap target={{ lat: 34.6, lng: 112.4 }} me={null} />)
    expect(screen.getByTestId('location-map')).toBeInTheDocument()
  })

  it('无任何坐标也渲染（idle 默认视角）', () => {
    render(<LocationMap target={null} me={null} />)
    expect(screen.getByTestId('location-map')).toBeInTheDocument()
  })
})
