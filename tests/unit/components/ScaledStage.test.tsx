/** @jest-environment jsdom */
import { render, screen, fireEvent, act } from '@testing-library/react'
import ScaledStage from '@/components/ScaledStage'

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
      width: '1600px',
      height: '900px',
      transform: `scale(${1024 / 1600})`,
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
      width: '1600px',
      height: '900px',
      transform: 'scale(1.2)',
    })
    expect(screen.getByTestId('scaled-stage-sizer')).toHaveStyle({
      width: '1920px',
      height: '1080px',
    })
  })

  it('exposes the scaled-canvas attribute in scaled mode', () => {
    setViewport(1920, 1080)
    render(
      <ScaledStage>
        <div data-testid="child" />
      </ScaledStage>
    )
    // SCALED_CANVAS_SELECTOR scopes canvas overrides to this attribute:
    // it must be present exactly when the stage is scaled.
    expect(screen.getByTestId('scaled-stage')).toHaveAttribute(
      'data-scaled-canvas',
      ''
    )
  })

  it('renders no scaled-canvas attribute below the minimum width', () => {
    setViewport(375, 1000)
    render(
      <ScaledStage>
        <div data-testid="child" />
      </ScaledStage>
    )
    // display:contents removes the box and the attribute, so
    // [data-scaled-canvas] descendant selectors cannot match and
    // responsive base styles hold.
    expect(screen.getByTestId('scaled-stage')).not.toHaveAttribute(
      'data-scaled-canvas'
    )
    expect(screen.getByTestId('scaled-stage').getAttribute('style')).toContain(
      'display: contents'
    )
  })

  it('updates the scale on window resize', () => {
    setViewport(1440, 900)
    render(
      <ScaledStage>
        <div data-testid="child" />
      </ScaledStage>
    )
    expect(screen.getByTestId('scaled-stage')).toHaveStyle({
      transform: 'scale(0.9)',
    })
    act(() => {
      setViewport(2880, 1800)
      fireEvent(window, new Event('resize'))
    })
    expect(screen.getByTestId('scaled-stage')).toHaveStyle({
      transform: 'scale(1.8)',
    })
  })
})
