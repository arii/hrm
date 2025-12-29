/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import TimerControls from '@/app/client/control/components/TimerControls'
import {
  WebSocketContext,
  WebSocketContextType,
} from '@/context/WebSocketContext'
import { TimerData } from '@/types/websocket'
import '@testing-library/jest-dom'

// Mock framer-motion
jest.mock('framer-motion', () => ({
  ...jest.requireActual('framer-motion'),
  motion: {
    div: jest.fn(({ children }) => children),
  },
}))

const mockTimerData: TimerData = {
  isRunning: false,
  isPaused: false,
  mode: 'TABATA',
  currentPhase: 'IDLE',
  timeRemaining: 0,
  workDuration: 20,
  restDuration: 10,
  totalRounds: 8,
  currentRound: 0,
}

const mockWebSocketContext: WebSocketContextType = {
  timerData: mockTimerData,
  sendData: jest.fn(),
  connectionStatus: 'Connected',
  connect: jest.fn(),
  disconnect: jest.fn(),
  hrmData: [],
  spotifyData: {
    track: null,
    isPlaying: false,
    volumePercent: 0,
  },
  activeAlerts: [],
  spotifyServiceInitialized: false,
  userSettings: null,
}

describe('TimerControls', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.clearAllMocks()
  })

  it('optimistically updates the UI when the start button is clicked', async () => {
    const sendDataSpy = jest.spyOn(mockWebSocketContext, 'sendData')
    render(
      <WebSocketContext.Provider value={mockWebSocketContext}>
        <TimerControls />
      </WebSocketContext.Provider>
    )

    const startButton = screen.getByTestId('start-timer-button')
    act(() => {
      fireEvent.click(startButton)
    })

    // The UI should immediately update to show the timer as running
    await screen.findByTestId('timer-running')
    expect(screen.queryByTestId('start-timer-button')).not.toBeInTheDocument()
    expect(screen.getByTestId('stop-timer-button')).toBeInTheDocument()
    expect(sendDataSpy).toHaveBeenCalledWith({
      type: 'TIMER_COMMAND',
      command: 'START',
    })
  })

  it('reverts the optimistic UI update if the WebSocket is not connected', async () => {
    const disconnectedContext = {
      ...mockWebSocketContext,
      connectionStatus: 'Disconnected',
    }
    const sendDataSpy = jest.spyOn(disconnectedContext, 'sendData')

    render(
      <WebSocketContext.Provider value={disconnectedContext}>
        <TimerControls />
      </WebSocketContext.Provider>
    )

    const startButton = screen.getByTestId('start-timer-button')
    act(() => {
      fireEvent.click(startButton)
    })

    // The UI should revert back to the original state
    act(() => {
      jest.advanceTimersByTime(600)
    })

    await waitFor(() => {
      expect(screen.getByTestId('timer-stopped')).toBeInTheDocument()
    })
    expect(screen.getByTestId('start-timer-button')).toBeInTheDocument()
    expect(screen.queryByTestId('stop-timer-button')).not.toBeInTheDocument()
    expect(sendDataSpy).not.toHaveBeenCalledWith({
      type: 'TIMER_COMMAND',
      command: 'START',
    })
  })
})
