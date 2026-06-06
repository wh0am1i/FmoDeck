import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PortraitHint } from '../components/portrait-hint'
import { usePortraitPhone } from '../hooks/use-portrait-phone'

function Probe() {
  const portrait = usePortraitPhone()
  return <span data-testid="probe">{portrait ? 'portrait' : 'landscape'}</span>
}

describe('PortraitHint', () => {
  it('渲染旋转提示文案', () => {
    render(<PortraitHint />)
    expect(screen.getByTestId('portrait-hint')).toHaveTextContent('请旋转至横屏使用')
  })

  it('usePortraitPhone 默认（matchMedia matches=false）返回 false', () => {
    render(<Probe />)
    expect(screen.getByTestId('probe')).toHaveTextContent('landscape')
  })
})
