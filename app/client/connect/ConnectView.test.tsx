/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ConnectView from './ConnectView'
import { WorkoutStatus } from '../../../types/workout'
import { MeasurementSystem, Gender } from '../../../types/core'
import { UserProfileState } from '@/types/connect'

describe('ConnectView', () => {
  const defaultUserProfile: UserProfileState = {
    data: {
      userName: 'Test User',
      userAge: '30',
      userHeight: { cm: '180', feet: '5', inches: '11' },
      userWeight: '154',
      gender: 'MALE' as Gender,
      unitSystem: 'IMPERIAL' as MeasurementSystem,
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

  const defaultProps = {
    duration: '00:00:00',
    caloriesBurned: 0,
    userProfile: defaultUserProfile,
    isConnected: false,
    deviceStatus: 'Disconnected',
    batteryLevel: null,
    onConnect: jest.fn(),
    onDisconnect: jest.fn(),
    onForgetDevice: jest.fn().mockResolvedValue(undefined),
    isSupported: true,
    signalPeriodMs: 1000,
    currentHR: 0,
    hrZoneData: { percentage: 0, zone: 'ZONE_0' as const },
    connectionStatus: 'Disconnected',
    bluetoothConnected: false,
    hasStarted: false,
    onReset: jest.fn(),
    workoutStatus: 'idle' as WorkoutStatus,
    onStartWorkout: jest.fn(),
    onPauseWorkout: jest.fn(),
    onEndWorkout: jest.fn(),
  }

  it('displays an error message for invalid age only when ageError is set', () => {
    // Negative assertion: no error initially
    const { rerender } = render(<ConnectView {...defaultProps} />)
    expect(screen.queryByText('Invalid age')).not.toBeInTheDocument()

    // Positive assertion: error appears when prop is set
    const props = {
      ...defaultProps,
      userProfile: {
        ...defaultUserProfile,
        errors: { ...defaultUserProfile.errors, ageError: 'Invalid age' },
      },
    }
    rerender(<ConnectView {...props} />)
    expect(screen.getByText('Invalid age')).toBeInTheDocument()
  })

  it('displays an error message for invalid height only when heightError is set', () => {
    const { rerender } = render(<ConnectView {...defaultProps} />)
    expect(screen.queryByText('Invalid height')).not.toBeInTheDocument()

    const props = {
      ...defaultProps,
      userProfile: {
        ...defaultUserProfile,
        errors: { ...defaultUserProfile.errors, heightError: 'Invalid height' },
      },
    }
    rerender(<ConnectView {...props} />)
    expect(screen.getByText('Invalid height')).toBeInTheDocument()
  })

  it('displays an error message for invalid weight only when weightError is set', () => {
    const { rerender } = render(<ConnectView {...defaultProps} />)
    expect(screen.queryByText('Invalid weight')).not.toBeInTheDocument()

    const props = {
      ...defaultProps,
      userProfile: {
        ...defaultUserProfile,
        errors: { ...defaultUserProfile.errors, weightError: 'Invalid weight' },
      },
    }
    rerender(<ConnectView {...props} />)
    expect(screen.getByText('Invalid weight')).toBeInTheDocument()
  })

  it('calls onUnitChange when the unit toggle is clicked', () => {
    render(<ConnectView {...defaultProps} />)
    const metricButton = screen.getByLabelText('metric units')
    fireEvent.click(metricButton)
    expect(defaultUserProfile.handlers.onUnitChange).toHaveBeenCalledWith(
      'METRIC'
    )
  })

  it('renders metric inputs when unit is metric', () => {
    const props = {
      ...defaultProps,
      userProfile: {
        ...defaultUserProfile,
        data: {
          ...defaultUserProfile.data,
          unitSystem: 'METRIC' as MeasurementSystem,
        },
      },
    }
    render(<ConnectView {...props} />)
    expect(screen.getByLabelText('Your Height (cm)')).toBeInTheDocument()
    expect(screen.getByLabelText('Your Weight (kg)')).toBeInTheDocument()
  })

  it('renders imperial inputs when unit is imperial', () => {
    render(<ConnectView {...defaultProps} />)
    expect(screen.getByLabelText('Feet')).toBeInTheDocument()
    expect(screen.getByLabelText('Inches')).toBeInTheDocument()
    expect(screen.getByLabelText('Your Weight (lbs)')).toBeInTheDocument()
  })

  it('renders gender selection', () => {
    render(<ConnectView {...defaultProps} />)
    expect(screen.getByLabelText('Male')).toBeInTheDocument()
    expect(screen.getByLabelText('Female')).toBeInTheDocument()
  })

  it('calls setGender when gender is changed', () => {
    render(<ConnectView {...defaultProps} />)
    const femaleRadio = screen.getByLabelText('Female')
    fireEvent.click(femaleRadio)
    expect(defaultUserProfile.handlers.setGender).toHaveBeenCalledWith('FEMALE')
  })

  it('renders the reset section with correct text', () => {
    render(<ConnectView {...defaultProps} />)
    expect(screen.getByText('Reset Permissions & Settings')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Resets stored permissions and device settings, including Bluetooth connection.'
      )
    ).toBeInTheDocument()
  })

  it('calls onReset when reset button is clicked', async () => {
    render(<ConnectView {...defaultProps} />)
    const resetButton = screen.getByText('Reset Permissions & Settings')
    fireEvent.click(resetButton)

    await waitFor(() => {
      expect(defaultProps.onForgetDevice).toHaveBeenCalled()
      expect(defaultProps.onReset).toHaveBeenCalled()
    })
  })
})
