// components/TimerDisplay/ProgressRing.test.tsx
import React from 'react'
import { render, screen } from '@testing-library/react'
import ProgressRing from './ProgressRing'

describe('ProgressRing', () => {
  it('renders the phase and duration correctly', () => {
    render(
      <ProgressRing
        progress={0.5}
        phase="Work"
        phaseDuration={30}
      />
    )

    expect(screen.getByText('Work')).toBeInTheDocument()
    expect(screen.getByText('30s')).toBeInTheDocument()
  })
})
