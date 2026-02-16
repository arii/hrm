/**
 * @jest-environment jsdom
 */
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ConnectPage from '@/app/client/connect/page'
import {
  UserSettingsContext,
  UserPreferences,
} from '@/context/UserSettingsContext'
import { WebSocketProvider } from '@/context/WebSocketContext'
import { toDisplay } from '@/utils/units'
import { useWorkoutSession } from '@/hooks/useWorkoutSession'

// Define mocks at the top level
const mockConnectAndStream = jest.fn()
const mockAutoConnect = jest.fn().mockResolvedValue(undefined)
const mockDisconnect = jest.fn()
const mockForgetDevice = jest.fn()

const mockResetWorkout = jest.fn()
const mockStartWorkout = jest.fn()
const mockPauseWorkout = jest.fn()
const mockEndWorkout = jest.fn()

const mockPersistentStartWorkout = jest.fn()
const mockPersistentEndWorkout = jest.fn()
const mockPersistentResetWorkout = jest.fn()
const mockAddHrData = jest.fn()

const mockShowSuccess = jest.fn()
const mockShowError = jest.fn()

const mockUseWorkoutSessionManager = jest.fn(() => ({
  session: null,
  status: 'idle',
  isInitialized: true,
  duration: 0,
  startWorkout: mockPersistentStartWorkout,
  resumeWorkout: jest.fn(),
  endWorkout: mockPersistentEndWorkout,
  resetWorkout: mockPersistentResetWorkout,
  addHrData: mockAddHrData,
}))

const mockUseSession = jest.fn(() => ({
  data: null,
  status: 'unauthenticated',
}))

// Initialize global fetch mock
global.fetch = jest.fn()

// Mocks
jest.mock('@/hooks/useBluetoothHRM', () =>
  jest.fn(() => ({
    connectAndStream: mockConnectAndStream,
    autoConnect: mockAutoConnect,
    disconnect: mockDisconnect,
    forgetDevice: mockForgetDevice,
    deviceStatus: 'disconnected',
    batteryLevel: null,
    isConnected: false,
    isDataStale: false,
    isSupported: true,
    disconnectionReason: null,
  }))
)

jest.mock('@/hooks/useWorkoutSession', () => ({
  __esModule: true,
  useWorkoutSession: jest.fn(() => ({
    workoutDuration: 0,
    caloriesBurned: 0,
    resetWorkout: mockResetWorkout,
    hasStarted: false,
    startWorkout: mockStartWorkout,
    pauseWorkout: mockPauseWorkout,
    endWorkout: mockEndWorkout,
    workoutStatus: 'idle',
  })),
}))

jest.mock('@/hooks/useWorkoutSessionManager', () => ({
  __esModule: true,
  useWorkoutSessionManager: () => mockUseWorkoutSessionManager(),
}))

jest.mock('next-auth/react', () => ({
  __esModule: true,
  useSession: () => mockUseSession(),
  signIn: jest.fn(),
  signOut: jest.fn(),
}))

jest.mock('@/hooks/useAppSnackbar', () => ({
  useAppSnackbar: jest.fn(() => ({
    showSuccess: mockShowSuccess,
    showError: mockShowError,
    showInfo: jest.fn(),
    showWarning: jest.fn(),
  })),
}))

jest.mock('@/context/WebSocketContext', () => ({
  useWebSocket: () => ({
    connectionStatus: 'Connected',
    sendData: jest.fn(),
  }),
  WebSocketProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}))

const mockUserSettings: UserPreferences = {
  theme: 'dark',
  volumeLevel: 70,
  defaultWorkDuration: 20,
  defaultRestDuration: 10,
  favoritePlaylist: '',
  userName: 'Test User',
  userAge: 30,
  userWeight: 70, // in kg
  autoConnect: false,
  gender: 'MALE',
  unitSystem: 'METRIC',
}

type SetUserSettings = (
  value: UserPreferences | ((val: UserPreferences) => UserPreferences)
) => void

const renderWithProviders = (
  ui: React.ReactElement,
  {
    providerProps,
  }: {
    providerProps: {
      value: [UserPreferences, SetUserSettings]
    }
  }
) => {
  return render(
    <WebSocketProvider>
      <UserSettingsContext.Provider {...providerProps}>
        {ui}
      </UserSettingsContext.Provider>
    </WebSocketProvider>
  )
}

describe('ConnectPage', () => {
  let providerProps: {
    value: [UserPreferences, SetUserSettings]
  }
  let setUserSettings: jest.Mock
  let consoleErrorSpy: jest.SpyInstance

  beforeEach(() => {
    setUserSettings = jest.fn()
    providerProps = {
      value: [mockUserSettings, setUserSettings],
    }
    // Suppress console.error output from React related to act warnings if any
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    // Reset mocks
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockReset()

    // Setup default mock returns
    mockUseWorkoutSessionManager.mockReturnValue({
      session: null,
      status: 'idle',
      isInitialized: true,
      duration: 0,
      startWorkout: mockPersistentStartWorkout,
      resumeWorkout: jest.fn(),
      endWorkout: mockPersistentEndWorkout,
      resetWorkout: mockPersistentResetWorkout,
      addHrData: mockAddHrData,
    })
    ;(useWorkoutSession as jest.Mock).mockReturnValue({
      workoutDuration: 0,
      caloriesBurned: 0,
      resetWorkout: mockResetWorkout,
      hasStarted: false,
      startWorkout: mockStartWorkout,
      pauseWorkout: mockPauseWorkout,
      endWorkout: mockEndWorkout,
      workoutStatus: 'idle',
    })

    mockUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated',
    })
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
  })

  it('displays the initial weight correctly based on the unit system', () => {
    renderWithProviders(<ConnectPage />, { providerProps })
    const weightInput = screen.getByLabelText(/Your Weight/)
    expect(weightInput).toHaveValue(
      toDisplay(mockUserSettings.userWeight!, mockUserSettings.unitSystem)
    )
  })

  it('updates the userWeight in context on blur', () => {
    renderWithProviders(<ConnectPage />, { providerProps })
    const weightInput = screen.getByLabelText(/Your Weight/)

    fireEvent.change(weightInput, { target: { value: '75' } })
    fireEvent.blur(weightInput)

    expect(setUserSettings).toHaveBeenCalledWith(expect.any(Function))

    const updater = setUserSettings.mock.calls[0][0]
    const newSettings = updater(mockUserSettings)
    expect(newSettings.userWeight).toBe(75)
  })

  it('converts and displays the weight correctly when the unit system changes', () => {
    const { rerender } = renderWithProviders(<ConnectPage />, { providerProps })

    let weightInput = screen.getByLabelText(/Your Weight/)
    expect(weightInput).toHaveValue(70)

    // Simulate user clicking the imperial button
    const imperialButton = screen.getByRole('button', { name: 'imperial' })
    fireEvent.click(imperialButton)

    // Check that setUserSettings was called to update the unit system
    expect(setUserSettings).toHaveBeenCalled()
    const updater = setUserSettings.mock.calls[0][0]
    const newSettings = updater(mockUserSettings)
    expect(newSettings.unitSystem).toBe('IMPERIAL')

    // Rerender with the new settings to see the updated display value
    const newProviderProps = {
      value: [newSettings, setUserSettings] as [
        UserPreferences,
        SetUserSettings,
      ],
    }

    rerender(
      <WebSocketProvider>
        <UserSettingsContext.Provider {...newProviderProps}>
          <ConnectPage />
        </UserSettingsContext.Provider>
      </WebSocketProvider>
    )

    weightInput = screen.getByLabelText(/Your Weight/)
    const weightInLbs = toDisplay(mockUserSettings.userWeight!, 'IMPERIAL')
    expect(weightInput).toHaveValue(weightInLbs)
  })

  it('calls the export API when the export button is clicked', async () => {
    const mockSession = {
      sessionId: 'test-session-id',
      hrHistory: [{ time: 1000, hr: 100 }],
    }

    mockUseWorkoutSessionManager.mockReturnValue({
      session: mockSession,
      status: 'finished',
      isInitialized: true,
      duration: 10,
      startWorkout: mockPersistentStartWorkout,
      resumeWorkout: jest.fn(),
      endWorkout: mockPersistentEndWorkout,
      resetWorkout: mockPersistentResetWorkout,
      addHrData: mockAddHrData,
    })
    ;(useWorkoutSession as jest.Mock).mockReturnValue({
      workoutDuration: 10,
      caloriesBurned: 100,
      resetWorkout: mockResetWorkout,
      hasStarted: true,
      startWorkout: mockStartWorkout,
      pauseWorkout: mockPauseWorkout,
      endWorkout: mockEndWorkout,
      workoutStatus: 'idle',
    })

    mockUseSession.mockReturnValue({
      data: { provider: 'strava', accessToken: 'test-token' },
      status: 'authenticated',
    })
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    })

    renderWithProviders(<ConnectPage />, { providerProps })

    const exportButton = screen.getByRole('button', {
      name: /Export workout to Strava/i,
    })
    fireEvent.click(exportButton)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        `/api/workout/export/${mockSession.sessionId}`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(mockSession),
        })
      )
    })

    await waitFor(() => {
      expect(mockShowSuccess).toHaveBeenCalledWith(
        'Workout successfully exported to Strava!'
      )
    })
  })

  it('shows an error message when export fails', async () => {
    const mockSession = {
      sessionId: 'test-session-id',
      hrHistory: [{ time: 1000, hr: 100 }],
    }

    mockUseWorkoutSessionManager.mockReturnValue({
      session: mockSession,
      status: 'finished',
      isInitialized: true,
      duration: 10,
      startWorkout: mockPersistentStartWorkout,
      resumeWorkout: jest.fn(),
      endWorkout: mockPersistentEndWorkout,
      resetWorkout: mockPersistentResetWorkout,
      addHrData: mockAddHrData,
    })
    ;(useWorkoutSession as jest.Mock).mockReturnValue({
      workoutDuration: 10,
      caloriesBurned: 100,
      resetWorkout: mockResetWorkout,
      hasStarted: true,
      startWorkout: mockStartWorkout,
      pauseWorkout: mockPauseWorkout,
      endWorkout: mockEndWorkout,
      workoutStatus: 'idle',
    })

    mockUseSession.mockReturnValue({
      data: { provider: 'strava', accessToken: 'test-token' },
      status: 'authenticated',
    })
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Strava API limit exceeded' }),
    })

    renderWithProviders(<ConnectPage />, { providerProps })

    const exportButton = screen.getByRole('button', {
      name: /Export workout to Strava/i,
    })
    fireEvent.click(exportButton)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled()
    })

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith('Strava API limit exceeded')
    })
  })
})
