import { render, screen } from '@testing-library/react'
import React from 'react'

import TimerDisplay from '@/components/TimerDisplay'

describe('TimerDisplay', () => {
  it('renders the timer with the correct phase and time', () => {
    render(
      <TimerDisplay
        phase="Work"
        timeRemaining={20}
        timeElapsed={10}
        mode="TABATA"
        workDuration={20}
        restDuration={10}
        soundEventId={null}
      />
    )
    expect(screen.getByText('Work')).toBeInTheDocument()
    expect(screen.getByText('20')).toBeInTheDocument()
  })
})
