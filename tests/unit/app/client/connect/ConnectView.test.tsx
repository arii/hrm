/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ConnectView from '@/app/client/connect/ConnectView'
import '@testing-library/jest-dom'
import { UserProfileState } from '@/types/connect'

describe('ConnectView', () => {
  const mockUserProfile: UserProfileState = {
    data: {
      userName: 'Test User',
      userAge: '30',
      userAgeNum: 30,
      userHeight: { cm: '175', feet: '5', inches: '9' },
      userHeightCm: 175,
      userWeight: '70',
      userWeightKg: 70,
      gender: 'MALE' as const,
      unitSystem: 'METRIC' as const,
    },
    handlers: {
      setUserName: jest.fn(),
      setUserAge: jest.fn(),
      onAgeBlur: jest.fn(),
      setUserHeight: jest.fn(),
      onHeightBlur: jest.fn(),
      setUserWeight: jest.fn(),
      onWeightBlur: jest.fn(),
      setGender: jest.fn(),
      onUnitChange: jest.fn(),
    },
    errors: {
      ageError: null,
      heightError: null,
      weightError: null,
    },
  }

  const mockProps = {
    duration: '00:00',
    caloriesBurned: 0,
    userProfile: mockUserProfile,
    isConnected: false,
    deviceStatus: 'Disconnected',
    batteryLevel: null,
    onConnect: jest.fn(),
    onDisconnect: jest.fn(),
    onForgetDevice: jest.fn().mockResolvedValue(undefined),
    isSupported: true,
    currentHR: 0,
    hrZoneData: { percentage: 0, zone: 'ZONE_0' as const },
    connectionStatus: 'Connected',
    bluetoothConnected: false,
    hasStarted: false,
    isResetting: false,
    workoutStatus: 'idle' as const,
    onStartWorkout: jest.fn(),
    onEndWorkout: jest.fn(),
    onPauseWorkout: jest.fn(),
    signalPeriodMs: 1000,
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

  it('calls onForgetDevice when the reset button is clicked', async () => {
    render(<ConnectView {...mockProps} />)
    const resetButton = screen.getByRole('button', {
      name: /Reset Permissions & Settings/i,
    })
    fireEvent.click(resetButton)

    await waitFor(() => {
      expect(mockProps.onForgetDevice).toHaveBeenCalled()
    })
  })

  it('displays an error message for invalid age only when ageError is set', () => {
    const { rerender } = render(<ConnectView {...mockProps} />)
    expect(screen.queryByText('Invalid age')).not.toBeInTheDocument()

    const propsWithAgeError = {
      ...mockProps,
      userProfile: {
        ...mockUserProfile,
        errors: { ...mockUserProfile.errors, ageError: 'Invalid age' },
      },
    }
    rerender(<ConnectView {...propsWithAgeError} />)
    expect(screen.getByText('Invalid age')).toBeInTheDocument()
  })

  it('displays an error message for invalid height only when heightError is set', () => {
    const { rerender } = render(<ConnectView {...mockProps} />)
    expect(screen.queryByText('Invalid height')).not.toBeInTheDocument()

    const propsWithHeightError = {
      ...mockProps,
      userProfile: {
        ...mockUserProfile,
        errors: { ...mockUserProfile.errors, heightError: 'Invalid height' },
      },
    }
    rerender(<ConnectView {...propsWithHeightError} />)
    expect(screen.getByText('Invalid height')).toBeInTheDocument()
  })

  it('displays an error message for invalid weight only when weightError is set', () => {
    const { rerender } = render(<ConnectView {...mockProps} />)
    expect(screen.queryByText('Invalid weight')).not.toBeInTheDocument()

    const propsWithWeightError = {
      ...mockProps,
      userProfile: {
        ...mockUserProfile,
        errors: { ...mockUserProfile.errors, weightError: 'Invalid weight' },
      },
    }
    rerender(<ConnectView {...propsWithWeightError} />)
    expect(screen.getByText('Invalid weight')).toBeInTheDocument()
  })
})
