/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import TimerControls from '@/app/client/control/components/TimerControls'
import {
  WebSocketContext,
  WebSocketContextType,
} from '@/context/WebSocketContext'
import { DISCONNECTED_UI_REVERT_DELAY } from '@/app/client/control/constants'
import { TimerData } from '@/types/websocket'
import { useSpotifyCommand } from '@/hooks/useSpotifyCommand'
import { jest } from '@jest/globals'
import '@testing-library/jest-dom'

// Mock framer-motion
jest.mock('framer-motion', () => ({
  ...jest.requireActual('framer-motion'),
  motion: {
    div: jest.fn(({ children }) => children),
  },
}))

// Mock useSpotifyCommand
jest.mock('@/hooks/useSpotifyCommand')
const mockedUseSpotifyCommand = useSpotifyCommand as jest.MockedFunction<
  typeof useSpotifyCommand
>

const mockTimerData: TimerData = {
  isRunning: false,
  currentPhase: 'IDLE',
  timeRemaining: 0,
  timeElapsed: 0,
  caloriesBurned: 0,
  mode: 'TABATA',
  workDuration: 20,
  restDuration: 10,
  soundEventId: 0,
}

const mockWebSocketContext: WebSocketContextType = {
  timerData: mockTimerData,
  sendData: jest.fn(),
  connectionStatus: 'Connected',
  connect: jest.fn(),
  disconnect: jest.fn(),
  hrmData: [],
  spotifyData: {
    devices: [],
    playback: {
      track: {
        id: null,
        name: '',
        artist: '',
        albumName: '',
        albumArtUrl: '',
      },
      is_playing: false,
      volume_percent: 0,
      progress_ms: 0,
      isMuted: false,
    },
  },
  activeAlerts: [],
  spotifyServiceInitialized: true,
}

describe('TimerControls', () => {
  const executeSpotifyMock = jest.fn()

  const mockHookValue = {
    execute: executeSpotifyMock,
    activeDevice: null,
    hrmPlayer: null,
    playback: {
      track: { id: null, name: '', artist: '', albumName: '', albumArtUrl: '' },
      is_playing: false,
      volume_percent: 0,
      isMuted: false,
      progress_ms: 0,
    },
    isHrmPlayerActive: false,
  }

  beforeEach(() => {
    jest.useFakeTimers()
    jest.clearAllMocks()
    mockedUseSpotifyCommand.mockReturnValue(mockHookValue)
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('optimistically updates UI to "running" when start is clicked and dispatches Spotify NEXT', async () => {
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

    // UI should immediately update to show the timer as running
    await screen.findByTestId('timer-running')
    expect(sendDataSpy).toHaveBeenCalledWith({
      type: 'TIMER_COMMAND',
      command: 'START',
    })

    // Verify Spotify command
    expect(executeSpotifyMock).toHaveBeenCalledWith('NEXT')
  })

  it('optimistically updates UI to "stopped" when stop is clicked and dispatches Spotify PAUSE', async () => {
    const runningContext = {
      ...mockWebSocketContext,
      timerData: { ...mockTimerData, isRunning: true },
    }
    const sendDataSpy = jest.spyOn(runningContext, 'sendData')
    render(
      <WebSocketContext.Provider value={runningContext}>
        <TimerControls />
      </WebSocketContext.Provider>
    )

    const stopButton = screen.getByTestId('stop-timer-button')
    act(() => {
      fireEvent.click(stopButton)
    })

    // UI should immediately update to show the timer as stopped
    await screen.findByTestId('timer-stopped')
    expect(sendDataSpy).toHaveBeenCalledWith({
      type: 'TIMER_COMMAND',
      command: 'STOP',
    })

    // Verify Spotify command
    expect(executeSpotifyMock).toHaveBeenCalledWith('PAUSE')
  })

  it('reverts optimistic UI and does not send command if websocket is not connected', async () => {
    const disconnectedContext: WebSocketContextType = {
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

    // The UI should revert back to the original state after a timeout
    act(() => {
      jest.advanceTimersByTime(DISCONNECTED_UI_REVERT_DELAY + 1)
    })

    await waitFor(() => {
      expect(screen.getByTestId('timer-stopped')).toBeInTheDocument()
    })
    expect(sendDataSpy).not.toHaveBeenCalled()
  })

  it('sends TIMER_CONFIG when Work/Rest duration is updated via stepper', async () => {
    const sendDataSpy = jest.spyOn(mockWebSocketContext, 'sendData')
    render(
      <WebSocketContext.Provider value={mockWebSocketContext}>
        <TimerControls />
      </WebSocketContext.Provider>
    )

    // Find stepper increment buttons
    const increaseWorkButton = screen.getByRole('button', {
      name: /Increase Work Duration/i,
    })
    const increaseRestButton = screen.getByRole('button', {
      name: /Increase Rest Duration/i,
    })

    // Increase Work Duration: 20 -> 25
    act(() => {
      fireEvent.click(increaseWorkButton)
    })

    // Increase Rest Duration: 10 -> 15
    act(() => {
      fireEvent.click(increaseRestButton)
    })

    // Wait for the debounce timeout (500ms in TimerControls)
    act(() => {
      jest.advanceTimersByTime(550)
    })

    // Check if the TIMER_CONFIG message was sent with updated values
    expect(sendDataSpy).toHaveBeenCalledWith({
      type: 'TIMER_CONFIG',
      workDuration: 25,
      restDuration: 15,
    })
  })
})
