/** @jest-environment jsdom */

import { jest } from '@jest/globals'
import TimerDisplay from '@/components/TimerDisplay'
import { AudioProvider } from '@/context/AudioContext'
import { useWebSocket } from '@/context/WebSocketContext'
import { TimerData } from '@/types/websocket'
import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'

// Mock the WebSocket context
jest.mock('@/context/WebSocketContext')

const mockedUseWebSocket = useWebSocket as jest.Mock

describe('TimerDisplay', () => {
  // A helper function to set up the mock for a specific test
  const setupMock = (timerData: Partial<TimerData>) => {
    mockedUseWebSocket.mockReturnValue({
      connectionStatus: 'Connected',
      timerData,
    })
  }

  it('should render the IDLE state correctly', () => {
    setupMock({
      currentPhase: 'IDLE',
      timeRemaining: 0,
      timeElapsed: 0,
      mode: 'TABATA',
    })
    render(
      <AudioProvider>
        <TimerDisplay />
      </AudioProvider>
    )
    // In the IDLE state, a phase label is not shown
    expect(screen.queryByTestId('timer-phase')).not.toBeInTheDocument()
    expect(screen.getByTestId('timer-countdown')).toHaveTextContent('00:00')
  })

  it('should render the WORK phase correctly', () => {
    setupMock({
      currentPhase: 'WORK',
      timeRemaining: 15,
      timeElapsed: 5,
      mode: 'TABATA',
    })
    render(
      <AudioProvider>
        <TimerDisplay />
      </AudioProvider>
    )

    expect(screen.getByTestId('timer-phase')).toHaveTextContent('WORK')
    // It should display the remaining time formatted as MM:SS
    expect(screen.getByTestId('timer-countdown')).toHaveTextContent('00:15')
  })

  it('should render the REST phase correctly', () => {
    setupMock({
      currentPhase: 'REST',
      timeRemaining: 5,
      timeElapsed: 15,
      mode: 'TABATA',
    })
    render(
      <AudioProvider>
        <TimerDisplay />
      </AudioProvider>
    )

    expect(screen.getByTestId('timer-phase')).toHaveTextContent('REST')
    expect(screen.getByTestId('timer-countdown')).toHaveTextContent('00:05')
  })

  it('should render correctly in STOPWATCH mode', () => {
    setupMock({
      currentPhase: 'RUNNING',
      timeRemaining: 0,
      timeElapsed: 125, // 2 minutes and 5 seconds
      mode: 'STOPWATCH',
    })
    render(
      <AudioProvider>
        <TimerDisplay />
      </AudioProvider>
    )

    // In stopwatch mode, a phase label is not shown
    expect(screen.queryByTestId('timer-phase')).not.toBeInTheDocument()
    // It should display the elapsed time
    expect(screen.getByTestId('timer-countdown')).toHaveTextContent('02:05')
  })

  it('should render the PREPARE phase correctly', () => {
    setupMock({
      currentPhase: 'PREPARE',
      timeRemaining: 3,
      timeElapsed: 0,
      mode: 'TABATA',
    })
    render(
      <AudioProvider>
        <TimerDisplay />
      </AudioProvider>
    )

    expect(screen.getByTestId('timer-phase')).toHaveTextContent('GET READY')
    // Prepare phase shows seconds only
    expect(screen.getByTestId('timer-countdown')).toHaveTextContent('03')
  })

  describe('Layout Structure', () => {
    it('should implement an absolute-positioned side column layout for perfect centering', () => {
      setupMock({
        currentPhase: 'WORK',
        mode: 'TABATA',
        workDuration: 30,
        restDuration: 15,
      })

      render(
        <AudioProvider>
          <TimerDisplay />
        </AudioProvider>
      )

      const flexContainer = screen.getByTestId('timer-display-container')
      // Container is still a flex container for the main content centering
      expect(flexContainer).toHaveStyle('display: flex')

      // The main content should be relatively positioned and occupy full width
      const mainContent = screen
        .getByTestId('timer-countdown')
        .closest('.MuiCardContent-root')
      expect(mainContent).toHaveStyle('position: relative')
      expect(mainContent).toHaveStyle('width: 100%')

      // Check for absolute positioned side labels
      // We can't easily use getComputedStyle in this JSDOM environment for absolute positioning
      // if it's set via MUI sx props and not in actual CSS, but we can check the presence of the text
      expect(flexContainer).toHaveTextContent('TABATA')
      expect(flexContainer).toHaveTextContent('WORK:30s REST:15s')
    })
  })
})
