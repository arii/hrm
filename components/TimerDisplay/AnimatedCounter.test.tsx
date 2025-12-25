// components/TimerDisplay/AnimatedCounter.test.tsx
import React from 'react'
import { render, screen } from '@testing-library/react'
import AnimatedCounter from './AnimatedCounter'

describe('AnimatedCounter', () => {
  it('renders the initial time correctly', () => {
    render(<AnimatedCounter time={10} direction="down" />)
    expect(screen.getByText('10')).toBeInTheDocument()
  })

  it('renders a different time when the prop changes', () => {
    const { rerender } = render(<AnimatedCounter time={10} direction="down" />)

    rerender(<AnimatedCounter time={9} direction="down" />)
    expect(screen.getByText('9')).toBeInTheDocument()
    expect(screen.queryByText('10')).not.toBeInTheDocument()
  })
})
