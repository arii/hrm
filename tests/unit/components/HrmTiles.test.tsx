/**
 * @jest-environment jsdom
 */
import { render, screen, act } from '@testing-library/react'
import HrmTiles from '@/components/HrmTiles'
import { useWebSocket } from '@/context/WebSocketContext'
import {
  STALE_TILE_DISPLAY_THRESHOLD_MS,
  STALE_TILE_REMOVAL_THRESHOLD_MS,
} from '@/utils/constants'
import { HrmData } from '@/types/websocket'

// Mock dependencies
jest.mock('@/context/WebSocketContext')
jest.mock('@/components/HrTile', () => {
  return function MockHrTile({
    name,
    isDataStale,
  }: {
    name: string
    isDataStale: boolean
  }) {
    return (
      <div data-testid="mock-hr-tile">
        <span>{name}</span>
        {isDataStale && <span data-testid="stale-indicator">Stale</span>}
      </div>
    )
  }
})
jest.mock('@/utils/visualization', () => ({
  getHrZoneProps: jest.fn().mockReturnValue({ percentage: 50, color: 'blue' }),
}))

describe('HrmTiles Component', () => {
  const mockHrmData: HrmData[] = [
    {
      clientId: 'client-1',
      name: 'User 1',
      value: 120,
      calories: 100,
      isConnected: true,
      lastUpdated: Date.now(),
      maxHr: 190,
      age: 30,
    },
  ]

  const mockUseWebSocket = useWebSocket as jest.MockedFunction<
    typeof useWebSocket
  >

  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2024-01-01T12:00:00Z')) // Set a fixed start time

    mockUseWebSocket.mockReturnValue({
      hrmData: [],
      connectionStatus: 'Connected',
      activeAlerts: [],
      timerData: {
        isRunning: false,
        timeRemaining: 0,
        timeElapsed: 0,
        caloriesBurned: 0,
        mode: 'TABATA',
        currentPhase: 'WORK',
        workDuration: 20,
        restDuration: 10,
        soundEventId: 0,
      },
      spotifyData: {
        trackId: '1',
        trackName: 'Test Track',
        artist: 'Test Artist',
        albumName: 'Test Album',
        albumArtUrl: '',
        isPlaying: false,
        isMuted: false,
        volume: 50,
        devices: [],
      },
      sendData: jest.fn(),
      connect: jest.fn(),
      disconnect: jest.fn(),
      spotifyServiceInitialized: true,
    })
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.clearAllMocks()
  })

  it('renders active tiles initially', () => {
    mockUseWebSocket.mockReturnValue({
      ...mockUseWebSocket(),
      hrmData: [
        {
          ...mockHrmData[0],
          lastUpdated: Date.now(), // Fresh data
        },
      ],
    })

    render(<HrmTiles />)

    expect(screen.getByText('User 1')).toBeInTheDocument()
    expect(screen.queryByTestId('stale-indicator')).not.toBeInTheDocument()
  })

  it('marks tile as stale after STALE_TILE_DISPLAY_THRESHOLD_MS', () => {
    const lastUpdated = Date.now()
    mockUseWebSocket.mockReturnValue({
      ...mockUseWebSocket(),
      hrmData: [
        {
          ...mockHrmData[0],
          lastUpdated: lastUpdated,
        },
      ],
    })

    render(<HrmTiles />)

    // Initially fresh
    expect(screen.queryByTestId('stale-indicator')).not.toBeInTheDocument()

    // Advance time past display threshold but before removal threshold
    // We need to trigger the interval in HrmTiles which updates 'now'
    act(() => {
      jest.advanceTimersByTime(STALE_TILE_DISPLAY_THRESHOLD_MS + 11000)
    })

    expect(screen.getByText('User 1')).toBeInTheDocument()
    expect(screen.getByTestId('stale-indicator')).toBeInTheDocument()
  })

  it('removes tile after STALE_TILE_REMOVAL_THRESHOLD_MS', () => {
    const lastUpdated = Date.now()
    mockUseWebSocket.mockReturnValue({
      ...mockUseWebSocket(),
      hrmData: [
        {
          ...mockHrmData[0],
          lastUpdated: lastUpdated,
        },
      ],
    })

    render(<HrmTiles />)

    // Initially fresh
    expect(screen.getByText('User 1')).toBeInTheDocument()

    // Advance time past removal threshold
    act(() => {
      jest.advanceTimersByTime(STALE_TILE_REMOVAL_THRESHOLD_MS + 11000)
    })

    expect(screen.queryByText('User 1')).not.toBeInTheDocument()
  })
})
