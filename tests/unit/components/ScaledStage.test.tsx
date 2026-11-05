/** @jest-environment jsdom */
import { render, screen, fireEvent, act } from '@testing-library/react'
import ScaledStage, { useIsScaledLayout } from '@/components/ScaledStage'

const setViewport = (width: number, height: number) => {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    writable: true,
    value: width,
  })
  Object.defineProperty(window, 'innerHeight', {
    configurable: true,
    writable: true,
    value: height,
  })
}

const ScaledProbe = () => {
  const isScaledLayout = useIsScaledLayout()
  return (
    <div data-testid="scaled-probe">
      {isScaledLayout ? 'scaled' : 'responsive'}
    </div>
  )
}

describe('ScaledStage', () => {
  afterEach(() => {
    setViewport(1024, 768)
  })

  it('scales tablet-and-larger viewports to the fixed canvas', () => {
    setViewport(1024, 768)
    render(
      <ScaledStage>
        <div data-testid="child" />
      </ScaledStage>
    )
    expect(screen.getByTestId('scaled-stage')).toHaveStyle({
      width: '1440px',
      height: '900px',
      transform: `scale(${1024 / 1440})`,
    })
  })

  it('renders children transparently below the minimum width', () => {
    setViewport(500, 800)
    render(
      <ScaledStage>
        <div data-testid="child" />
      </ScaledStage>
    )
    expect(screen.getByTestId('child')).toBeInTheDocument()
    expect(screen.getByTestId('scaled-stage')).toHaveStyle({
      display: 'contents',
    })
  })

  it('scales the fixed canvas to fit wide viewports', () => {
    setViewport(1920, 1080)
    render(
      <ScaledStage>
        <div data-testid="child" />
      </ScaledStage>
    )
    expect(screen.getByTestId('scaled-stage')).toHaveStyle({
      width: '1440px',
      height: '900px',
      transform: 'scale(1.2)',
    })
    expect(screen.getByTestId('scaled-stage-sizer')).toHaveStyle({
      width: '1728px',
      height: '1080px',
    })
  })

  it('exposes the scaled flag through context', () => {
    setViewport(1920, 1080)
    render(
      <ScaledStage>
        <ScaledProbe />
      </ScaledStage>
    )
    expect(screen.getByTestId('scaled-probe')).toHaveTextContent('scaled')
  })

  it('reports responsive through context below the minimum width', () => {
    setViewport(375, 1000)
    render(
      <ScaledStage>
        <ScaledProbe />
      </ScaledStage>
    )
    expect(screen.getByTestId('scaled-probe')).toHaveTextContent('responsive')
  })

  it('updates the scale on window resize', () => {
    setViewport(1440, 900)
    render(
      <ScaledStage>
        <div data-testid="child" />
      </ScaledStage>
    )
    expect(screen.getByTestId('scaled-stage')).toHaveStyle({
      transform: 'scale(1)',
    })
    act(() => {
      setViewport(2880, 1800)
      fireEvent(window, new Event('resize'))
    })
    expect(screen.getByTestId('scaled-stage')).toHaveStyle({
      transform: 'scale(2)',
    })
  })
})
