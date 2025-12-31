/** @jest-environment jsdom */
// tests/unit/hooks/useHrmPanel.test.ts
import { renderHook } from '@testing-library/react'
import { useHrmPanel } from '@/hooks/useHrmPanel'
import { HrmData, ActiveAlert } from '@/types/websocket'
import { UserPreferences } from '@/hooks/useUserPreferences'

// Mock next-auth
jest.mock('next-auth/react', () => ({
  useSession: () => ({ data: null }),
}))

const mockConnectAndStream = jest.fn()

const initialHrmData: HrmData[] = [
  {
    clientId: '1',
    name: 'Test User',
    value: 120,
    zone: 'Cardio',
    calories: 100,
    maxHr: 180,
    restingHr: 60,
  },
  {
    clientId: '2',
    name: 'New User',
    value: 130,
    zone: 'Peak',
    calories: 150,
    maxHr: 190,
    restingHr: 70,
  },
]

const initialActiveAlerts: ActiveAlert[] = [
  {
    clientId: '1',
    code: 'BAD_PLACEMENT',
    message: 'Check sensor placement',
    severity: 'warning',
    timestamp: Date.now(),
  },
]

const initialUserSettings: UserPreferences = {
  userName: 'Test User',
  userAge: 30,
  theme: 'dark',
  volumeLevel: 80,
  favoritePlaylist: '',
  defaultWorkDuration: 20,
  defaultRestDuration: 10,
  userWeight: 70,
  autoConnect: true,
}

const initialProps = {
  hrmData: initialHrmData,
  activeAlerts: initialActiveAlerts,
  connectionStatus: 'Disconnected' as const,
  deviceStatus: 'Disconnected' as const,
  connectAndStream: mockConnectAndStream,
  userSettings: initialUserSettings,
}

describe('useHrmPanel', () => {
  beforeEach(() => {
    mockConnectAndStream.mockClear()
  })

  it('should filter out placeholder users', () => {
    const { result } = renderHook(() => useHrmPanel(initialProps))

    expect(result.current.tileData).toHaveLength(1)
    expect(result.current.tileData[0].name).toBe('Test User')
  })

  it('should add alert information to tileData', () => {
    const { result } = renderHook(() => useHrmPanel(initialProps))

    expect(result.current.tileData[0].isAlerting).toBe(true)
    expect(result.current.tileData[0].alertMessage).toBe(
      'Check sensor placement'
    )
  })

  it('should attempt to auto-connect when conditions are met', () => {
    renderHook(() =>
      useHrmPanel({
        ...initialProps,
        connectionStatus: 'Connected',
        deviceStatus: 'Disconnected',
      })
    )

    expect(mockConnectAndStream).toHaveBeenCalledWith('Test User', 30)
  })

  it('should not attempt to auto-connect if already connected', () => {
    renderHook(() =>
      useHrmPanel({
        ...initialProps,
        connectionStatus: 'Connected',
        deviceStatus: 'Connected',
      })
    )

    expect(mockConnectAndStream).not.toHaveBeenCalled()
  })

  it('should set isLoading to true when connecting', () => {
    const { result } = renderHook(() =>
      useHrmPanel({
        ...initialProps,
        connectionStatus: 'Connecting...',
      })
    )

    expect(result.current.isLoading).toBe(true)
  })

  it('should set isLoading to false when disconnected', () => {
    const { result } = renderHook(() => useHrmPanel(initialProps))

    expect(result.current.isLoading).toBe(false)
  })
})
