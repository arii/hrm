/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ConnectView from '@/app/client/connect/ConnectView'
import '@testing-library/jest-dom'

describe('ConnectView', () => {
  const mockProps = {
    duration: '00:00',
    caloriesBurned: 0,
    userName: 'Test User',
    setUserName: jest.fn(),
    userAge: '30',
    setUserAge: jest.fn(),
    onAgeBlur: jest.fn(),
    ageError: null,
    userHeight: { cm: '175', feet: '5', inches: '9' },
    setUserHeight: jest.fn(),
    onHeightBlur: jest.fn(),
    heightError: null,
    userWeight: '70',
    setUserWeight: jest.fn(),
    onWeightBlur: jest.fn(),
    weightError: null,
    gender: 'MALE' as const,
    setGender: jest.fn(),
    unitSystem: 'METRIC' as const,
    onUnitChange: jest.fn(),
    isConnected: false,
    deviceStatus: 'Disconnected',
    batteryLevel: null,
    onConnect: jest.fn(),
    onDisconnect: jest.fn(),
    onForgetDevice: jest.fn().mockResolvedValue(undefined),
    isSupported: true,
    currentHR: 0,
    hrZoneProps: { percentage: 0, progressColor: 'grey' },
    connectionStatus: 'Connected',
    bluetoothConnected: false,
    hasStarted: false,
    onReset: jest.fn(),
    workoutStatus: 'idle' as const,
    onStartWorkout: jest.fn(),
    onEndWorkout: jest.fn(),
  }

  it('renders the reset button when bluetooth is not supported', () => {
    render(<ConnectView {...mockProps} isSupported={false} />)
    const resetButton = screen.getByRole('button', {
      name: /Reset Permissions & Settings/i,
    })
    expect(resetButton).toBeInTheDocument()
  })

  it('renders the reset button as enabled by default', () => {
    render(<ConnectView {...mockProps} />)
    const resetButton = screen.getByRole('button', {
      name: /Reset Permissions & Settings/i,
    })
    expect(resetButton).toBeEnabled()
  })

  it('calls onForgetDevice and onReset when the reset button is clicked', async () => {
    render(<ConnectView {...mockProps} />)
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
