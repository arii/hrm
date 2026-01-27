/** @jest-environment jsdom */
import { act, fireEvent, render, screen } from '@testing-library/react'
import TimerControls from '../../../../../../app/client/control/components/TimerControls'
import { useWebSocket } from '../../../../../../context/WebSocketContext'
import { TimerData } from '../../../../../../types/websocket'
import { useSpotifyControls } from '../../../../../../hooks/useSpotifyControls'

// Mock the WebSocket and Spotify controls hooks
jest.mock('../../../../../../context/WebSocketContext')
jest.mock('../../../../../../hooks/useSpotifyControls')

describe('TimerControls', () => {
  let mockSendData: jest.Mock
  let mockSendSpotifyCommand: jest.Mock
  let mockTimerData: TimerData

  beforeEach(() => {
    mockSendData = jest.fn()
    mockSendSpotifyCommand = jest.fn()
    mockTimerData = {
      isRunning: false,
      mode: 'TABATA',
      currentPhase: 'WORK',
    }
    ;(useWebSocket as jest.Mock).mockReturnValue({
      timerData: mockTimerData,
      sendData: mockSendData,
      connectionStatus: 'Connected',
    })
    ;(useSpotifyControls as jest.Mock).mockReturnValue({
      sendSpotifyCommand: mockSendSpotifyCommand,
    })
  })

  it('renders correctly with initial state', () => {
    render(<TimerControls />)
    expect(screen.getByTestId('start-timer-button')).toBeInTheDocument()
    expect(screen.getByText('Timer Stopped')).toBeInTheDocument()
  })

  it('optimistically updates to "running" when start is clicked', () => {
    render(<TimerControls />)
    fireEvent.click(screen.getByTestId('start-timer-button'))
    expect(screen.getByTestId('stop-timer-button')).toBeInTheDocument()
    expect(screen.getByText('Timer Running')).toBeInTheDocument()
  })

  it('sends START command and NEXT spotify command on start', () => {
    render(<TimerControls />)
    fireEvent.click(screen.getByTestId('start-timer-button'))
    expect(mockSendData).toHaveBeenCalledWith({
      type: 'TIMER_COMMAND',
      command: 'START',
    })
    expect(mockSendSpotifyCommand).toHaveBeenCalledWith('NEXT')
  })

  it('optimistically updates to "stopped" when stop is clicked', () => {
    mockTimerData.isRunning = true
    render(<TimerControls />)
    fireEvent.click(screen.getByTestId('stop-timer-button'))
    expect(screen.getByTestId('start-timer-button')).toBeInTheDocument()
    expect(screen.getByText('Timer Stopped')).toBeInTheDocument()
  })

  it('sends STOP command and PAUSE spotify command on stop', () => {
    mockTimerData.isRunning = true
    render(<TimerControls />)
    fireEvent.click(screen.getByTestId('stop-timer-button'))
    expect(mockSendData).toHaveBeenCalledWith({
      type: 'TIMER_COMMAND',
      command: 'STOP',
    })
    expect(mockSendSpotifyCommand).toHaveBeenCalledWith('PAUSE')
  })

  it('reverts optimistic state if server state changes', () => {
    const { rerender } = render(<TimerControls />)
    // Optimistically start the timer
    fireEvent.click(screen.getByTestId('start-timer-button'))
    expect(screen.getByText('Timer Running')).toBeInTheDocument()

    // Simulate a server update that contradicts the optimistic state
    const newTimerData = { ...mockTimerData, isRunning: false }
    ;(useWebSocket as jest.Mock).mockReturnValue({
      timerData: newTimerData,
      sendData: mockSendData,
      connectionStatus: 'Connected',
    })
    rerender(<TimerControls />)

    // The UI should revert to the server's state
    expect(screen.getByText('Timer Stopped')).toBeInTheDocument()
  })

  it('clears optimistic state after a timeout', () => {
    jest.useFakeTimers()
    render(<TimerControls />)
    fireEvent.click(screen.getByTestId('start-timer-button'))
    expect(screen.getByText('Timer Running')).toBeInTheDocument()

    // Fast-forward time
    act(() => {
      jest.advanceTimersByTime(5000)
    })

    // The UI should revert to the server's state
    expect(screen.getByText('Timer Stopped')).toBeInTheDocument()
    jest.useRealTimers()
  })
})
