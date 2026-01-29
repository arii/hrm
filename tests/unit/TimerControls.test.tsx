/** @jest-environment jsdom */

import { jest } from '@jest/globals'
import TimerControls from '@/app/client/control/components/TimerControls'
import { useWebSocket } from '@/context/WebSocketContext'
import { useSpotifyControls } from '@/hooks/useSpotifyControls'
import type { TimerData } from '@/types/websocket'
import '@testing-library/jest-dom'
import { render, screen, fireEvent } from '@testing-library/react'

type UseWebSocketReturn = ReturnType<typeof useWebSocket>

jest.mock('@/context/WebSocketContext')
jest.mock('@/hooks/useSpotifyControls')
jest.useFakeTimers()

const mockedUseWebSocket = useWebSocket as jest.MockedFunction<
  () => UseWebSocketReturn
>
const mockedUseSpotifyControls = useSpotifyControls as jest.MockedFunction<
  () => ReturnType<typeof useSpotifyControls>
>

const baseTimerData: TimerData = {
  isRunning: false,
  currentPhase: 'IDLE',
  timeRemaining: 20,
  timeElapsed: 0,
  mode: 'TABATA',
  workDuration: 20,
  restDuration: 10,
  soundEventId: 0,
}

describe('TimerControls', () => {
  let sendData: jest.Mock
  let sendSpotifyCommand: jest.Mock

  beforeEach(() => {
    sendData = jest.fn()
    sendSpotifyCommand = jest.fn()

    mockedUseWebSocket.mockReturnValue({
      hrmData: [],
      timerData: { ...baseTimerData },
      spotifyData: {
        trackName: '',
        artist: '',
        isPlaying: false,
        albumArtUrl: '',
        albumName: '',
        devices: [],
        isMuted: false,
        volume: 0,
      },
      spotifyServiceInitialized: true,
      connectionStatus: 'Connected',
      sendData,
      isOwner: true,
      connect: jest.fn(),
      disconnect: jest.fn(),
    })

    mockedUseSpotifyControls.mockReturnValue({
      sendSpotifyCommand,
    })
  })

  it('should render the initial state correctly', () => {
    render(<TimerControls />)
    expect(screen.getByTestId('work-duration-input')).toHaveTextContent('20')
    expect(screen.getByTestId('rest-duration-input')).toHaveTextContent('10')
    expect(screen.getByTestId('start-timer-button')).toBeInTheDocument()
  })

  it('should send a TIMER_CONFIG message when durations change', () => {
    render(<TimerControls />)

    const increaseWorkButton = screen.getByTestId('work-duration-input-increment-button')
    const increaseRestButton = screen.getByTestId('rest-duration-input-increment-button')

    fireEvent.click(increaseWorkButton)
    fireEvent.click(increaseRestButton)

    jest.advanceTimersByTime(500)

    expect(sendData).toHaveBeenCalledWith({
      type: 'TIMER_CONFIG',
      workDuration: 25,
      restDuration: 15,
    })
  })

  it('should send a START command', () => {
    render(<TimerControls />)
    const startButton = screen.getByTestId('start-timer-button')
    fireEvent.click(startButton)

    expect(sendData).toHaveBeenCalledWith({
      type: 'TIMER_COMMAND',
      command: 'START',
    })
  })

  it('should send a STOP command', () => {
    mockedUseWebSocket.mockReturnValue({
      ...mockedUseWebSocket(),
      timerData: { ...baseTimerData, isRunning: true },
    })
    const { getByTestId } = render(<TimerControls />)
    const stopButton = getByTestId('stop-timer-button')
    fireEvent.click(stopButton)

    expect(sendData).toHaveBeenCalledWith({
      type: 'TIMER_COMMAND',
      command: 'STOP',
    })
  })
})
