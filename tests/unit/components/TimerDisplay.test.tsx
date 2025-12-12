/** @jest-environment jsdom */

import TimerDisplay from '@/components/TimerDisplay'
import { useWebSocket } from '@/context/WebSocketContext'
import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'

// Mock the WebSocket context
jest.mock('@/context/WebSocketContext')

const mockedUseWebSocket = useWebSocket as jest.Mock

describe('TimerDisplay', () => {
  beforeEach(() => {
    // Mock the part of the hook that IS used for the connection status indicator
    mockedUseWebSocket.mockReturnValue({
      connectionStatus: 'Connected',
    })
  })

  it('should render the IDLE state correctly', () => {
    render(
      <TimerDisplay
        phase="IDLE"
        timeRemaining={0}
        timeElapsed={0}
        mode="TABATA"
      />
    )
    // In the IDLE state, a phase label is not shown
    expect(screen.queryByTestId('timer-phase')).not.toBeInTheDocument()
    expect(screen.getByTestId('timer-countdown')).toHaveTextContent('00:00')
  })

  it('should render the WORK phase correctly', () => {
    render(
      <TimerDisplay
        phase="WORK"
        timeRemaining={15}
        timeElapsed={5}
        mode="TABATA"
      />
    )

    expect(screen.getByTestId('timer-phase')).toHaveTextContent('WORK')
    // It should display the remaining time formatted as MM:SS
    expect(screen.getByTestId('timer-countdown')).toHaveTextContent('00:15')
  })

  it('should render the REST phase correctly', () => {
    render(
      <TimerDisplay
        phase="REST"
        timeRemaining={5}
        timeElapsed={15}
        mode="TABATA"
      />
    )

    expect(screen.getByTestId('timer-phase')).toHaveTextContent('REST')
    expect(screen.getByTestId('timer-countdown')).toHaveTextContent('00:05')
  })

  it('should render correctly in STOPWATCH mode', () => {
    render(
      <TimerDisplay
        phase="RUNNING"
        timeRemaining={0}
        timeElapsed={125} // 2 minutes and 5 seconds
        mode="STOPWATCH"
      />
    )

    // In stopwatch mode, a phase label is not shown
    expect(screen.queryByTestId('timer-phase')).not.toBeInTheDocument()
    // It should display the elapsed time
    expect(screen.getByTestId('timer-countdown')).toHaveTextContent('02:05')
  })

  it('should render the PREPARE phase correctly', () => {
    render(
      <TimerDisplay
        phase="PREPARE"
        timeRemaining={3}
        timeElapsed={0}
        mode="TABATA"
      />
    )

    expect(screen.getByTestId('timer-phase')).toHaveTextContent('GET READY')
    // Prepare phase shows seconds only
    expect(screen.getByTestId('timer-countdown')).toHaveTextContent('03')
  })
})
