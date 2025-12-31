/** @jest-environment jsdom */
// tests/unit/hooks/useHrmPanel.test.ts
import { renderHook } from '@testing-library/react'
import { useHrmPanel } from '@/hooks/useHrmPanel'
import { HrmData, Alert } from '@/types/websocket'
import { UserSettings } from '@/types/index'

// Mock next-auth
jest.mock('next-auth/react', () => ({
  useSession: () => ({ data: null }),
}))

const mockConnectAndStream = jest.fn()

const initialHrmData: HrmData[] = [
  {
    clientId: '1',
    name: 'Test User',
    heartRate: 120,
    zone: 'Cardio',
    calories: 100,
    maxHr: 180,
    restingHr: 60,
  },
  {
    clientId: '2',
    name: 'New User',
    heartRate: 130,
    zone: 'Peak',
    calories: 150,
    maxHr: 190,
    restingHr: 70,
  },
]

const initialActiveAlerts: Alert[] = [
  {
    clientId: '1',
    code: 'BAD_PLACEMENT',
    message: 'Check sensor placement',
    severity: 'warning',
    timestamp: Date.now(),
  },
]

const initialUserSettings: UserSettings = {
  userName: 'Test User',
  userAge: 30,
  maxHr: 190,
  restingHr: 60,
  weight: 70,
  height: 180,
  gender: 'male',
  birthDate: '1994-01-01',
  timeZone: 'UTC',
  weekStartsOn: 'monday',
  email: 'test@example.com',
  name: 'Test User',
  stravaRefreshToken: 'strava-refresh-token',
  stravaAccessToken: 'strava-access-token',
  stravaTokenExpiresAt: Date.now() + 3600,
  stravaUser: {
    id: 12345,
    username: 'testuser',
    firstname: 'Test',
    lastname: 'User',
    city: 'Test City',
    state: 'Test State',
    country: 'Test Country',
    sex: 'M',
    profile: 'https://test.com/profile.png',
  },
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
