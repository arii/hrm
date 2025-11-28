/**
 * @jest-environment jsdom
 */
import { useWebSocket } from '@/context/WebSocketContext'
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { describe, it, expect, jest, beforeEach } from '@jest/globals'

import TimerControls from '@/app/client/control/components/TimerControls'

// Mock the useWebSocket hook
jest.mock('@/context/WebSocketContext')

const mockSendData = jest.fn()

const mockTimerData = {
  isRunning: false,
  currentPhase: 'IDLE',
  timeRemaining: 0,
  timeElapsed: 0,
  mode: 'TABATA',
  workDuration: 20,
  restDuration: 10,
  soundEventId: 0,
}

const mockSpotifyData = {
  trackName: 'Test Track',
  artist: 'Test Artist',
  isPlaying: false,
}

describe('TimerControls', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useWebSocket as jest.Mock).mockReturnValue({
      timerData: mockTimerData,
      spotifyData: mockSpotifyData,
      sendData: mockSendData,
    })
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    }) as any
  })

  it('renders correctly', async () => {
    await act(async () => {
      render(<TimerControls />)
    })
    expect(screen.getByText('Timer Mode')).toBeInTheDocument()
    expect(screen.getByText('Tabata')).toBeInTheDocument()
    expect(screen.getByText('Stopwatch')).toBeInTheDocument()
    expect(screen.getByText('Timer Stopped')).toBeInTheDocument()
    expect(screen.getByText('Work Duration (seconds)')).toBeInTheDocument()
    expect(screen.getByText('Rest Duration (seconds)')).toBeInTheDocument()
    expect(screen.getByText('START')).toBeInTheDocument()
  })

  it('sends a SET_MODE command when Tabata button is clicked', async () => {
    await act(async () => {
      render(<TimerControls />)
    })
    fireEvent.click(screen.getByText('Tabata'))
    expect(mockSendData).toHaveBeenCalledWith({
      type: 'SET_MODE',
      mode: 'TABATA',
    })
  })

  it('sends a SET_MODE command when Stopwatch button is clicked', async () => {
    await act(async () => {
      render(<TimerControls />)
    })
    fireEvent.click(screen.getByText('Stopwatch'))
    expect(mockSendData).toHaveBeenCalledWith({
      type: 'SET_MODE',
      mode: 'STOPWATCH',
    })
  })

  it('sends a TIMER_COMMAND with START when START button is clicked', async () => {
    await act(async () => {
      render(<TimerControls />)
    })
    fireEvent.click(screen.getByText('START'))
    expect(mockSendData).toHaveBeenCalledWith({
      type: 'TIMER_COMMAND',
      command: 'START',
      deviceId: null,
    })
  })

  it('sends a TIMER_CONFIG message before sending the START command', async () => {
    await act(async () => {
      render(<TimerControls />)
    })
    fireEvent.click(screen.getByText('START'))
    expect(mockSendData).toHaveBeenCalledWith({
      type: 'TIMER_CONFIG',
      workDuration: 20,
      restDuration: 10,
    })
  })

  it('displays STOP button when timer is running', async () => {
    ;(useWebSocket as jest.Mock).mockReturnValue({
      timerData: { ...mockTimerData, isRunning: true },
      spotifyData: mockSpotifyData,
      sendData: mockSendData,
    })
    await act(async () => {
      render(<TimerControls />)
    })
    expect(screen.getByText('STOP')).toBeInTheDocument()
  })

  it('sends a TIMER_COMMAND with STOP when STOP button is clicked', async () => {
    ;(useWebSocket as jest.Mock).mockReturnValue({
      timerData: { ...mockTimerData, isRunning: true },
      spotifyData: mockSpotifyData,
      sendData: mockSendData,
    })
    await act(async () => {
      render(<TimerControls />)
    })
    fireEvent.click(screen.getByText('STOP'))
    expect(mockSendData).toHaveBeenCalledWith({
      type: 'TIMER_COMMAND',
      command: 'STOP',
      deviceId: null,
    })
  })

  it('updates work duration when + button is clicked', async () => {
    await act(async () => {
      render(<TimerControls />)
    })
    const increaseButton = screen.getByLabelText('Increase work duration')
    fireEvent.click(increaseButton)
    const workDurationInput = screen.getByTestId('work-duration-input')
    await waitFor(() => expect(workDurationInput).toHaveValue(25))
  })

  it('updates rest duration when - button is clicked', async () => {
    await act(async () => {
      render(<TimerControls />)
    })
    const decreaseButton = screen.getByLabelText('Decrease rest duration')
    fireEvent.click(decreaseButton)
    const restDurationInput = screen.getByTestId('rest-duration-input')
    await waitFor(() => expect(restDurationInput).toHaveValue(5))
  })

  it('sends a TIMER_CONFIG message when work duration is changed', async () => {
    await act(async () => {
      render(<TimerControls />)
    })
    const increaseButton = screen.getByLabelText('Increase work duration')
    act(() => {
      fireEvent.click(increaseButton)
    })

    await waitFor(() =>
      expect(mockSendData).toHaveBeenCalledWith({
        type: 'TIMER_CONFIG',
        workDuration: 25,
        restDuration: 10,
      })
    )
  })
})
