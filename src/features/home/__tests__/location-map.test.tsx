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
    pad: ret
  })
  return {
    default: {
      map: ret,
      tileLayer: ret,
      circleMarker: ret,
      polyline: ret,
      latLngBounds: ret
    }
  }
})

import { LocationMap } from '../components/location-map'

describe('LocationMap', () => {
  it('给定对方+我方坐标，渲染地图容器', () => {
    render(<LocationMap their={{ lat: 34.6, lng: 112.4 }} me={{ lat: 36, lng: 103.8 }} />)
    expect(screen.getByTestId('location-map')).toBeInTheDocument()
  })

  it('无我方坐标也渲染（仅标对方）', () => {
    render(<LocationMap their={{ lat: 34.6, lng: 112.4 }} me={null} />)
    expect(screen.getByTestId('location-map')).toBeInTheDocument()
  })
})
