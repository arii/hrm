/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ConnectView from '@/app/client/connect/ConnectView'
import { ConnectSettingsProvider } from '@/app/client/connect/context/ConnectSettingsContext'
import { UserSettingsContext } from '@/context/UserSettingsContext'
import '@testing-library/jest-dom'

const mockUserSettings = {
  theme: 'dark' as const,
  volumeLevel: 70,
  defaultWorkDuration: 20,
  defaultRestDuration: 10,
  favoritePlaylist: '',
  userName: 'Test User',
  userAge: 30,
  userWeight: 70,
  autoConnect: false,
  gender: 'MALE' as const,
  unitSystem: 'METRIC' as const,
  hrZoneMethod: 'MAX_HR' as const,
  maxHrOverride: null,
  restingHr: null,
  customZoneThresholds: {
    ZONE_1: 50,
    ZONE_2: 60,
    ZONE_3: 70,
    ZONE_4: 80,
    ZONE_5: 90,
    ZONE_6: 95,
  },
}

describe('ConnectView', () => {
  const mockProps = {
    duration: '00:00',
    caloriesBurned: 0,
    isConnected: false,
    deviceStatus: 'Disconnected',
    batteryLevel: null,
    onConnect: jest.fn(),
    onDisconnect: jest.fn(),
    onForgetDevice: jest.fn().mockResolvedValue(undefined),
    isSupported: true,
    currentHR: 0,
    hrZoneProps: { percentage: 0 },
    connectionStatus: 'Connected',
    bluetoothConnected: false,
    hasStarted: false,
    onReset: jest.fn(),
    workoutStatus: 'idle' as const,
    onStartWorkout: jest.fn(),
    onPauseWorkout: jest.fn(),
    onEndWorkout: jest.fn(),
    session: null,
    signalPeriodMs: 1000,
    zone: 0,
  }

  const renderWithProvider = (ui: React.ReactElement) => {
    return render(
      <UserSettingsContext.Provider value={[mockUserSettings, jest.fn()]}>
        <ConnectSettingsProvider>{ui}</ConnectSettingsProvider>
      </UserSettingsContext.Provider>
    )
  }

  it('renders the reset button when bluetooth is not supported', () => {
    renderWithProvider(<ConnectView {...mockProps} isSupported={false} />)
    const resetButton = screen.getByRole('button', {
      name: /Reset Permissions & Settings/i,
    })
    expect(resetButton).toBeInTheDocument()
  })

  it('renders the reset button as enabled by default', () => {
    renderWithProvider(<ConnectView {...mockProps} />)
    const resetButton = screen.getByRole('button', {
      name: /Reset Permissions & Settings/i,
    })
    expect(resetButton).toBeEnabled()
  })

  it('calls onForgetDevice and onReset when the reset button is clicked', async () => {
    renderWithProvider(<ConnectView {...mockProps} />)
    const resetButton = screen.getByRole('button', {
      name: /Reset Permissions & Settings/i,
    })
    fireEvent.click(resetButton)

    await waitFor(() => {
      expect(mockProps.onForgetDevice).toHaveBeenCalled()
      expect(mockProps.onReset).toHaveBeenCalled()
    })
  })
})
