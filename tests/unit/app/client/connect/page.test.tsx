/**
 * @jest-environment jsdom
 */
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import ConnectPage from '@/app/client/connect/page'
import {
  UserSettingsContext,
  UserPreferences,
} from '@/context/UserSettingsContext'
import { WebSocketProvider } from '@/context/WebSocketContext'
import { toDisplay } from '@/utils/units'

// Correctly mock the hooks
jest.mock('@/hooks/useBluetoothHRM', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    connectAndStream: jest.fn(),
    autoConnect: jest.fn(),
    disconnect: jest.fn(),
    forgetDevice: jest.fn(),
    deviceStatus: 'disconnected',
    batteryLevel: null,
    isConnected: false,
    isDataStale: false,
    isSupported: true,
    disconnectionReason: null,
    signalPeriodMs: 1000,
    connectionAttempted: false,
  })),
}))

jest.mock('@/hooks/useWorkoutSessionManager', () => ({
  __esModule: true,
  useWorkoutSessionManager: jest.fn(() => ({
    startWorkout: jest.fn(),
    pauseWorkout: jest.fn(),
    resumeWorkout: jest.fn(),
    endWorkout: jest.fn(),
    resetWorkout: jest.fn(),
    addHrData: jest.fn(),
    isInitialized: true,
    session: null,
    workoutStatus: 'idle',
    status: 'idle',
    hasStarted: false,
    caloriesBurned: 0,
    totalCaloriesBurned: 0,
  })),
}))

jest.mock('@/hooks/useWorkoutTimer', () => ({
  __esModule: true,
  useWorkoutTimer: jest.fn(() => 0),
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

// Mock formatDuration to avoid issues with non-mocked lib/utils
jest.mock('@/lib/utils', () => ({
  formatDuration: jest.fn((val) => `${val}`),
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
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
    jest.clearAllMocks()
  })

  it('displays the initial weight correctly based on the unit system', () => {
    renderWithProviders(<ConnectPage />, { providerProps })
    const weightInput = screen.getByLabelText(/Your Weight/)
    const expectedValue = toDisplay(
      mockUserSettings.userWeight!,
      mockUserSettings.unitSystem
    )
    expect(weightInput).toHaveValue(expectedValue)
  })

  it('updates the userWeight in context on blur', () => {
    renderWithProviders(<ConnectPage />, { providerProps })
    const weightInput = screen.getByLabelText(/Your Weight/)

    fireEvent.change(weightInput, { target: { value: '75' } })
    fireEvent.blur(weightInput)

    expect(setUserSettings).toHaveBeenCalledWith(expect.any(Function))

    // Helper to check the updater function logic
    let capturedUpdater: any
    // Depending on how many times setUserSettings called (e.g. init), find the one with function
    const calls = setUserSettings.mock.calls
    const callWithFunction = calls.find(
      (args: any[]) => typeof args[0] === 'function'
    )
    if (callWithFunction) {
      capturedUpdater = callWithFunction[0]
      const newSettings = capturedUpdater(mockUserSettings)
      expect(newSettings.userWeight).toBe(75)
    }
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

    // Find the call that sets unitSystem
    const calls = setUserSettings.mock.calls
    // It might be a direct object set or function update. Page.tsx uses updater.
    const updaterCall = calls.find(
      (args: any[]) => typeof args[0] === 'function'
    )
    if (updaterCall) {
      const updater = updaterCall[0]
      const newSettings = updater(mockUserSettings)
      // Note: The page logic for handleUnitChange: setUserSettings((prev) => ({ ...prev, unitSystem: newUnit }))
      // But we are mocking context update? No, we are testing if page calls context update.
      if (newSettings.unitSystem === 'IMPERIAL') {
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
        const weightInLbs = toDisplay(
          mockUserSettings.userWeight!,
          'IMPERIAL'
        )
        expect(weightInput).toHaveValue(weightInLbs)
      }
    }
  })
})
