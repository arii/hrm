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
import { SnackbarProvider } from 'notistack'

// Mock the useSnackbar hook
const mockEnqueueSnackbar = jest.fn()
jest.mock('notistack', () => ({
  ...jest.requireActual('notistack'),
  useSnackbar: () => ({
    enqueueSnackbar: mockEnqueueSnackbar,
  }),
}))

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

describe('TimerControls Notifications', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    mockEnqueueSnackbar.mockClear()
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.clearAllMocks()
  })

  it('shows a warning notification if optimistic action times out', async () => {
    render(
      <SnackbarProvider>
        <WebSocketContext.Provider value={mockWebSocketContext}>
          <TimerControls />
        </WebSocketContext.Provider>
      </SnackbarProvider>
    )

    const startButton = screen.getByTestId('start-timer-button')
    act(() => {
      fireEvent.click(startButton)
    })

    // Advance timers past the safety timeout
    act(() => {
      jest.advanceTimersByTime(3100)
    })

    await waitFor(() => {
      expect(mockEnqueueSnackbar).toHaveBeenCalledWith(
        'Server response timed out. Please try again.',
        {
          variant: 'warning',
        }
      )
    })
  })

  it('shows an error notification if websocket is not connected', async () => {
    const disconnectedContext = {
      ...mockWebSocketContext,
      connectionStatus: 'Disconnected',
    }

    render(
      <SnackbarProvider>
        <WebSocketContext.Provider value={disconnectedContext}>
          <TimerControls />
        </WebSocketContext.Provider>
      </SnackbarProvider>
    )

    const startButton = screen.getByTestId('start-timer-button')
    act(() => {
      fireEvent.click(startButton)
    })

    await waitFor(() => {
      expect(mockEnqueueSnackbar).toHaveBeenCalledWith(
        'Connection lost. Please check your network.',
        {
          variant: 'error',
        }
      )
    })
  })
})
