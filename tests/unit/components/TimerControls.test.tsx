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
        phase: 'idle',
        timeRemaining: 0,
        currentRound: 0,
        totalRounds: 0,
      },
      spotifyData: null,
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
        phase: 'work',
        timeRemaining: 10,
        currentRound: 1,
        totalRounds: 10,
      },
      spotifyData: null,
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
