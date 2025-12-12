/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import TimerDisplay from '../../../components/TimerDisplay'

// Mock the WebSocket context to provide controlled data for the test
jest.mock('../../../context/WebSocketContext', () => ({
  useWebSocket: () => ({
    connectionStatus: 'Connected',
    timerData: {
      isRunning: true,
      currentPhase: 'IDLE',
      timeRemaining: 0,
      timeElapsed: 0,
      mode: 'TABATA',
      workDuration: 20,
      restDuration: 10,
    },
  }),
}))

describe('TimerDisplay', () => {
  // Test Case 1: Renders IDLE state correctly
  it('should render the IDLE state correctly', () => {
    render(
      <TimerDisplay
        phase="IDLE"
        timeRemaining={0}
        timeElapsed={0}
        mode="TABATA"
      />
    )

    // Check for "READY" phase label and "00:00" display
    expect(screen.getByText('READY')).toBeInTheDocument()
    const timerText = screen.getByTestId('timer-countdown')
    expect(timerText).toHaveTextContent('00:00')
    // Check for gray color styling (approximated)
    expect(timerText).toHaveStyle('color: #6B7280') // Gray-400
  })

  // Test Case 2: Renders WORK phase correctly
  it('should render the WORK phase correctly', () => {
    render(
      <TimerDisplay
        phase="WORK"
        timeRemaining={15}
        timeElapsed={5}
        mode="TABATA"
      />
    )

    // Check for "WORK" phase label and "00:15" display
    expect(screen.getByText('WORK')).toBeInTheDocument()
    const timerText = screen.getByTestId('timer-countdown')
    expect(timerText).toHaveTextContent('00:15')
    // Check for red color styling
    expect(timerText).toHaveStyle('color: #EF4444') // Red-500
  })

  // Test Case 3: Renders REST phase correctly
  it('should render the REST phase correctly', () => {
    render(
      <TimerDisplay
        phase="REST"
        timeRemaining={8}
        timeElapsed={2}
        mode="TABATA"
      />
    )

    // Check for "REST" phase label and "00:08" display
    expect(screen.getByText('REST')).toBeInTheDocument()
    const timerText = screen.getByTestId('timer-countdown')
    expect(timerText).toHaveTextContent('00:08')
    // Check for green color styling
    expect(timerText).toHaveStyle('color: #22C55E') // Green-500
  })

  // Test Case 4: Renders PREPARE phase correctly
  it('should render the PREPARE phase correctly', () => {
    render(
      <TimerDisplay
        phase="PREPARE"
        timeRemaining={3}
        timeElapsed={0}
        mode="TABATA"
      />
    )

    // Check for "GET READY" phase label and "03" display
    expect(screen.getByText('GET READY')).toBeInTheDocument()
    const timerText = screen.getByTestId('timer-countdown')
    expect(timerText).toHaveTextContent('03')
    // Check for yellow color styling
    expect(timerText).toHaveStyle('color: #F59E0B') // Amber-500
  })

  // Test Case 5: Renders Stopwatch mode correctly
  it('should render Stopwatch mode correctly', () => {
    render(
      <TimerDisplay
        phase="RUNNING"
        timeRemaining={0}
        timeElapsed={95} // 1 minute 35 seconds
        mode="STOPWATCH"
      />
    )

    // Check for no specific phase label (just the time)
    expect(screen.queryByTestId('timer-phase')).not.toBeInTheDocument()
    // Check for "01:35" display
    const timerText = screen.getByTestId('timer-countdown')
    expect(timerText).toHaveTextContent('01:35')
    // Check for blue color styling for running stopwatch
    expect(timerText).toHaveStyle('color: #2563EB') // Blue-600
  })
})
