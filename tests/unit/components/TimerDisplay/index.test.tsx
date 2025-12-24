// tests/unit/components/TimerDisplay/index.test.tsx
/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import TimerDisplay from '@/components/TimerDisplay'
import { WebSocketContext } from '@/context/WebSocketContext'
import * as AudioContext from '@/context/AudioContext'

// Mock the useAudioContext hook
jest.mock('@/context/AudioContext')
const useAudioContextMock = AudioContext.useAudioContext as jest.Mock

const mockWebSocketContext = {
  connectionStatus: 'Connected',
  timerData: {
    currentPhase: 'IDLE',
    timeRemaining: 0,
    timeElapsed: 0,
    mode: 'TABATA',
    workDuration: 20,
    restDuration: 10,
  },
}

const renderWithProviders = (ui, { webSocketProviderProps, ...renderOptions }) => {
  return render(
    <WebSocketContext.Provider value={{ ...mockWebSocketContext, ...webSocketProviderProps }}>
      {ui}
    </WebSocketContext.Provider>,
    renderOptions
  )
}

describe('TimerDisplay', () => {
  beforeEach(() => {
    useAudioContextMock.mockReturnValue({
      volume: 50,
      setVolume: jest.fn(),
      muted: false,
      toggleMute: jest.fn(),
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('renders in IDLE state', () => {
    renderWithProviders(<TimerDisplay />, {})
    expect(screen.getByText('IDLE')).toBeInTheDocument()
    expect(screen.getByText('00:00')).toBeInTheDocument()
  })

  it('renders in PREPARE state', () => {
    const timerData = {
      currentPhase: 'PREPARE',
      timeRemaining: 5,
    }
    renderWithProviders(<TimerDisplay />, { webSocketProviderProps: { timerData } })
    expect(screen.getByText('GET READY')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('renders in WORK state', () => {
    const timerData = {
      currentPhase: 'WORK',
      timeRemaining: 15,
      mode: 'TABATA',
    }
    renderWithProviders(<TimerDisplay />, { webSocketProviderProps: { timerData } })
    expect(screen.getByText('WORK')).toBeInTheDocument()
    expect(screen.getByText('00:15')).toBeInTheDocument()
  })

  it('renders in REST state', () => {
    const timerData = {
      currentPhase: 'REST',
      timeRemaining: 8,
      mode: 'TABATA',
    }
    renderWithProviders(<TimerDisplay />, { webSocketProviderProps: { timerData } })
    expect(screen.getByText('REST')).toBeInTheDocument()
    expect(screen.getByText('00:08')).toBeInTheDocument()
  })

  it('renders in RUNNING state for STOPWATCH mode', () => {
    const timerData = {
      currentPhase: 'RUNNING',
      timeElapsed: 125,
      mode: 'STOPWATCH',
    }
    renderWithProviders(<TimerDisplay />, { webSocketProviderProps: { timerData } })
    expect(screen.getByText('RUNNING')).toBeInTheDocument()
    expect(screen.getByText('02:05')).toBeInTheDocument()
  })

  it('displays the connection status', () => {
    renderWithProviders(<TimerDisplay />, { webSocketProviderProps: { connectionStatus: 'Reconnecting...' } })
    expect(screen.getByText('Reconnecting...')).toBeInTheDocument()
  })
})
