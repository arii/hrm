/**
 * @jest-environment jsdom
 */
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import ConnectPage from '@/app/client/connect/page'
import { WebSocketProvider } from '@/context/WebSocketContext'
import { useUserSettingsForm } from '@/hooks/useUserSettingsForm'

// Mock the hooks
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
  })),
}))

jest.mock('@/hooks/useWorkoutSession', () => ({
  useWorkoutSession: jest.fn(() => ({
    workoutDuration: 0,
    resetWorkout: jest.fn(),
    hasStarted: false,
    startWorkout: jest.fn(),
    pauseWorkout: jest.fn(),
    endWorkout: jest.fn(),
    workoutStatus: 'idle',
  })),
}))

jest.mock('@/hooks/useUserSettingsForm', () => ({
  useUserSettingsForm: jest.fn(),
}))
jest.mock('@/hooks/useHrmBroadcaster', () => ({
  useHrmBroadcaster: jest.fn(),
}))
jest.mock('@/hooks/useAutoConnect', () => ({
  useAutoConnect: jest.fn(),
}))

jest.mock('@/app/client/connect/ConnectView', () => ({
  __esModule: true,
  default: () => <div data-testid="mock-connect-view" />,
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

const mockUserSettings = {
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

const mockSetUserSettings = jest.fn()

describe('ConnectPage', () => {
  const mockUseUserSettingsForm = useUserSettingsForm as jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseUserSettingsForm.mockReturnValue({
      ...mockUserSettings,
      setUserSettings: mockSetUserSettings,
      displayWeight: mockUserSettings.userWeight!.toString(),
      ageError: null,
      weightError: null,
      displayHeight: { cm: '175', feet: '5', inches: '9' },
      handleHeightChange: jest.fn(),
      handleHeightBlur: jest.fn(),
      heightError: null,
      handleAgeBlur: jest.fn(),
      handleWeightChange: jest.fn(),
      handleWeightBlur: jest.fn(),
      handleUnitChange: jest.fn(),
    })
  })

  it('displays the initial weight correctly based on the unit system', () => {
    render(
      <WebSocketProvider>
        <ConnectPage />
      </WebSocketProvider>
    )
    const weightInput = screen.getByLabelText(/Weight/i)
    expect(weightInput).toHaveValue('70')
  })

  it('updates the userWeight in context on blur', () => {
    render(
      <WebSocketProvider>
        <ConnectPage />
      </WebSocketProvider>
    )
    const weightInput = screen.getByLabelText(/Weight/i)
    fireEvent.change(weightInput, { target: { value: '75' } })
    fireEvent.blur(weightInput)
    expect(
      (useUserSettingsForm as jest.Mock)().handleWeightBlur
    ).toHaveBeenCalled()
  })

  it('handles unit system changes', () => {
    render(
      <WebSocketProvider>
        <ConnectPage />
      </WebSocketProvider>
    )
    const imperialButton = screen.getByRole('button', { name: /Imperial/i })
    fireEvent.click(imperialButton)

    expect(
      (useUserSettingsForm as jest.Mock)().handleUnitChange
    ).toHaveBeenCalledWith('IMPERIAL')
  })
})
