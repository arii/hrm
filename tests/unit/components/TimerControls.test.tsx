/**
 * @jest-environment jsdom
 */
import { render, fireEvent } from '@testing-library/react'
import { ThemeProvider } from '@mui/material/styles'
import TimerControls from '@/app/client/control/components/TimerControls'
import * as WebSocketContext from '@/context/WebSocketContext'
import theme from '@/lib/theme'

// Mock the WebSocket context
jest.mock('@/context/WebSocketContext')

describe('TimerControls', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks()

    // Mock WebSocket context
    jest.spyOn(WebSocketContext, 'useWebSocket').mockReturnValue({
      sendData: jest.fn(),
      connectionStatus: 'Connected',
      hrmData: [],
      timerData: {
        isRunning: false,
        phase: 'idle',
        timeRemaining: 0,
        currentRound: 0,
        totalRounds: 0,
        isRunning: false,
      },
      spotifyData: {
        trackId: null,
        trackName: '',
        artist: '',
        albumName: '',
        albumArtUrl: '',
        isPlaying: false,
        is_playing: false,
        devices: [],
        volume: 70,
        volume_percent: 70,
        isMuted: false,
      },
      workoutData: {
        totalCalories: 0,
        workoutDuration: 0,
      },
      lastJsonMessage: null,
    })
  })

  it('should send a START command when the start button is clicked', () => {
    const { getByTestId } = render(
      <ThemeProvider theme={theme}>
        <TimerControls />
      </ThemeProvider>
    )
    const startButton = getByTestId('start-timer-button')

    fireEvent.click(startButton)

    expect(WebSocketContext.useWebSocket().sendData).toHaveBeenCalledWith({
      type: 'TIMER_COMMAND',
      command: 'START',
    })
  })

  it('should send a STOP command when the stop button is clicked', () => {
    // Set the initial state to "running"
    jest.spyOn(WebSocketContext, 'useWebSocket').mockReturnValue({
      sendData: jest.fn(),
      connectionStatus: 'Connected',
      hrmData: [],
      timerData: {
        isRunning: true,
        phase: 'work',
        timeRemaining: 10,
        currentRound: 1,
        totalRounds: 10,
        isRunning: true,
      },
      spotifyData: {
        trackId: null,
        trackName: '',
        artist: '',
        albumName: '',
        albumArtUrl: '',
        isPlaying: false,
        is_playing: false,
        devices: [],
        volume: 70,
        volume_percent: 70,
        isMuted: false,
      },
      workoutData: {
        totalCalories: 0,
        workoutDuration: 0,
      },
      lastJsonMessage: null,
    })

    const { getByTestId } = render(
      <ThemeProvider theme={theme}>
        <TimerControls />
      </ThemeProvider>
    )
    const stopButton = getByTestId('stop-timer-button')

    fireEvent.click(stopButton)

    expect(WebSocketContext.useWebSocket().sendData).toHaveBeenCalledWith({
      type: 'TIMER_COMMAND',
      command: 'STOP',
    })
  })
})
