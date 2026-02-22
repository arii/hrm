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
import useBluetoothHRM from '@/hooks/useBluetoothHRM'

// Correctly mock the hooks
const mockConnectAndStream = jest.fn()
const mockAutoConnect = jest.fn().mockResolvedValue(undefined)
const mockDisconnect = jest.fn()
const mockForgetDevice = jest.fn()

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
    connectionAttempted: false,
  }))
)

jest.mock('@/hooks/useWorkoutSessionManager', () => ({
  __esModule: true,
  useWorkoutSessionManager: jest.fn(() => ({
    workoutDuration: 0,
    resetWorkout: jest.fn(),
    hasStarted: false,
    startWorkout: jest.fn(),
    pauseWorkout: jest.fn(),
    endWorkout: jest.fn(),
    workoutStatus: 'idle',
    addHrData: jest.fn(),
    caloriesBurned: 0,
    updateCalories: jest.fn(),
    isInitialized: true,
  })),
}))

const mockSendData = jest.fn()
jest.mock('@/context/WebSocketContext', () => ({
  useWebSocket: () => ({
    connectionStatus: 'Connected',
    sendData: mockSendData,
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
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
    jest.clearAllMocks()
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
    const imperialButton = screen.getByLabelText('imperial units')
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

  it('sends HRM_METADATA_UPDATE when user settings change', async () => {
    renderWithProviders(<ConnectPage />, { providerProps })

    await waitFor(() => {
      expect(mockSendData).toHaveBeenCalledWith({
        type: 'HRM_METADATA_UPDATE',
        data: {
          name: 'Test User',
          age: 30,
        },
      })
    })
  })

  it('renders user settings form when not connected', () => {
    renderWithProviders(<ConnectPage />, { providerProps })
    expect(screen.getByTestId('user-settings-form')).toBeInTheDocument()
  })

  it('calls connectAndStream with correct user data when connect button is clicked', () => {
    renderWithProviders(<ConnectPage />, { providerProps })
    const connectButton = screen.getByRole('button', {
      name: /Connect Bluetooth HRM/i,
    })
    fireEvent.click(connectButton)

    expect(mockConnectAndStream).toHaveBeenCalledWith('Test User', 30)
  })

  it('displays heart rate tile when connected', () => {
    jest.mocked(useBluetoothHRM).mockReturnValue({
      connectAndStream: mockConnectAndStream,
      autoConnect: mockAutoConnect,
      disconnect: mockDisconnect,
      forgetDevice: mockForgetDevice,
      deviceStatus: 'connected',
      batteryLevel: 90,
      isConnected: true,
      isDataStale: false,
      isSupported: true,
      disconnectionReason: null,
      connectionAttempted: true,
    })

    renderWithProviders(<ConnectPage />, { providerProps })
    expect(screen.getByTestId('bpm-value')).toBeInTheDocument()
    expect(screen.queryByTestId('user-settings-form')).not.toBeInTheDocument()
  })
})
