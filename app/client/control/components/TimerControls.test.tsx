import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import TimerControls from '@/app/client/control/components/TimerControls'
import { useWebSocket } from '@/context/WebSocketContext'
import { useSpotifyControls } from '@/hooks/useSpotifyControls'

jest.mock('@/context/WebSocketContext', () => ({
  useWebSocket: jest.fn(),
}))

jest.mock('@/hooks/useSpotifyControls', () => ({
  useSpotifyControls: jest.fn(),
}))

const mockUseWebSocket = useWebSocket as jest.Mock
const mockUseSpotifyControls = useSpotifyControls as jest.Mock

describe('TimerControls', () => {
  let mockSendData: jest.Mock
  let mockSendSpotifyCommand: jest.Mock

  beforeEach(() => {
    mockSendData = jest.fn()
    mockSendSpotifyCommand = jest.fn()
    mockUseWebSocket.mockReturnValue({
      timerData: { isRunning: false, currentPhase: 'WORK', mode: 'TABATA' },
      sendData: mockSendData,
      connectionStatus: 'Connected',
    })
    mockUseSpotifyControls.mockReturnValue({
      sendSpotifyCommand: mockSendSpotifyCommand,
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('sends TIMER_CONFIG message on work duration change', async () => {
    render(<TimerControls />)
    const workDurationInput = screen
      .getByTestId('work-duration-input')
      .querySelector('input')
    fireEvent.change(workDurationInput!, { target: { value: '30' } })

    await waitFor(() => {
      expect(mockSendData).toHaveBeenCalledWith({
        type: 'TIMER_CONFIG',
        workDuration: 30,
        restDuration: 10,
      })
    })
  })

  it('sends TIMER_CONFIG message on rest duration change', async () => {
    render(<TimerControls />)
    const restDurationInput = screen
      .getByTestId('rest-duration-input')
      .querySelector('input')
    fireEvent.change(restDurationInput!, { target: { value: '20' } })

    await waitFor(() => {
      expect(mockSendData).toHaveBeenCalledWith({
        type: 'TIMER_CONFIG',
        workDuration: 20,
        restDuration: 20,
      })
    })
  })

  it('sends START command and spotify NEXT on start button click', () => {
    render(<TimerControls />)
    fireEvent.click(screen.getByTestId('start-timer-button'))

    expect(mockSendData).toHaveBeenCalledWith({
      type: 'TIMER_COMMAND',
      command: 'START',
    })
    expect(mockSendSpotifyCommand).toHaveBeenCalledWith('NEXT')
  })

  it('sends STOP command and spotify PAUSE on stop button click', () => {
    mockUseWebSocket.mockReturnValue({
      timerData: { isRunning: true, currentPhase: 'WORK', mode: 'TABATA' },
      sendData: mockSendData,
      connectionStatus: 'Connected',
    })
    render(<TimerControls />)
    fireEvent.click(screen.getByTestId('stop-timer-button'))

    expect(mockSendData).toHaveBeenCalledWith({
      type: 'TIMER_COMMAND',
      command: 'STOP',
    })
    expect(mockSendSpotifyCommand).toHaveBeenCalledWith('PAUSE')
  })

  it('sends SET_MODE command when TABATA button is clicked', () => {
    render(<TimerControls />)
    fireEvent.click(screen.getByTestId('tabata-mode-button'))

    expect(mockSendData).toHaveBeenCalledWith({
      type: 'SET_MODE',
      mode: 'TABATA',
    })
  })

  it('sends SET_MODE command when STOPWATCH button is clicked', () => {
    render(<TimerControls />)
    fireEvent.click(screen.getByTestId('stopwatch-mode-button'))

    expect(mockSendData).toHaveBeenCalledWith({
      type: 'SET_MODE',
      mode: 'STOPWATCH',
    })
  })

  it('shows "Timer Running" when timer is running', () => {
    mockUseWebSocket.mockReturnValue({
      timerData: { isRunning: true, currentPhase: 'WORK', mode: 'TABATA' },
      sendData: mockSendData,
      connectionStatus: 'Connected',
    })
    render(<TimerControls />)
    expect(screen.getByTestId('timer-running')).toBeInTheDocument()
  })

  it('shows "Timer Stopped" when timer is not running', () => {
    render(<TimerControls />)
    expect(screen.getByTestId('timer-stopped')).toBeInTheDocument()
  })
})
