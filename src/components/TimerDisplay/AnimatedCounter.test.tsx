/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import AnimatedCounter from './AnimatedCounter'

describe('AnimatedCounter', () => {
  it('renders the display time', () => {
    render(<AnimatedCounter displayTime="12:34" phaseColor="#fff" />)
    expect(screen.getByText('12:34')).toBeInTheDocument()
  })

  it('applies the correct font family', () => {
    render(<AnimatedCounter displayTime="12:34" phaseColor="#fff" />)
    const counterElement = screen.getByTestId('timer-countdown')
    expect(counterElement).toHaveStyle(
      'font-family: var(--font-digital-7-mono), monospace'
    )
  })
})
