import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DirectionCompass } from '../components/direction-compass'

describe('DirectionCompass', () => {
  it('指针按 bearing 旋转，显示距离与方位词', () => {
    render(<DirectionCompass bearingDeg={45} distanceKm={342} cardinalKey="NE" />)
    expect(screen.getByTestId('direction-compass')).toBeInTheDocument()
    expect(screen.getByTestId('compass-needle').getAttribute('transform')).toContain('rotate(45')
    expect(screen.getByTestId('direction-compass')).toHaveTextContent('342 km')
    expect(screen.getByTestId('direction-compass')).toHaveTextContent('东北')
  })

  it('距离 <1km 显示 distanceLt1', () => {
    render(<DirectionCompass bearingDeg={0} distanceKm={0.4} cardinalKey="N" />)
    expect(screen.getByTestId('direction-compass')).toHaveTextContent('<1 km')
  })
})
