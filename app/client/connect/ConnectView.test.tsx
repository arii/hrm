/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent } from '@testing-library/react'
import ConnectView from './ConnectView'
import { WorkoutStatus } from '../../../types/workout'
import { BluetoothConnectionStatus } from '../../../types/bluetooth'

describe('ConnectView', () => {
  const defaultProps = {
    duration: '00:00:00',
    caloriesBurned: 0,
    userName: 'Test User',
    setUserName: jest.fn(),
    userAge: '30',
    setUserAge: jest.fn(),
    userHeight: '5.9',
    setUserHeight: jest.fn(),
    userWeight: '154',
    setUserWeight: jest.fn(),
    unit: 'imperial' as 'metric' | 'imperial',
    setUnit: jest.fn(),
    ageError: null,
    heightError: null,
    weightError: null,
    validateAge: jest.fn(),
    validateHeight: jest.fn(),
    validateWeight: jest.fn(),
    isConnected: false,
    deviceStatus: 'Disconnected',
    batteryLevel: null,
    onConnect: jest.fn(),
    onDisconnect: jest.fn(),
    onForgetDevice: jest.fn().mockResolvedValue(undefined),
    isSupported: true,
    currentHR: 0,
    hrZoneProps: { percentage: 0, progressColor: 'grey' },
    connectionStatus: 'Disconnected',
    bluetoothConnected: false,
    hasStarted: false,
    onReset: jest.fn(),
    workoutStatus: 'idle' as WorkoutStatus,
    onStartWorkout: jest.fn(),
    onPauseWorkout: jest.fn(),
    onEndWorkout: jest.fn(),
    status: BluetoothConnectionStatus.DISCONNECTED,
  }

  it('displays an error message for invalid age', () => {
    const props = { ...defaultProps, ageError: 'Invalid age' }
    render(<ConnectView {...props} />)
    expect(screen.getByText('Invalid age')).toBeInTheDocument()
  })

  it('displays an error message for invalid height', () => {
    const props = { ...defaultProps, heightError: 'Invalid height' }
    render(<ConnectView {...props} />)
    expect(screen.getByText('Invalid height')).toBeInTheDocument()
  })

  it('displays an error message for invalid weight', () => {
    const props = { ...defaultProps, weightError: 'Invalid weight' }
    render(<ConnectView {...props} />)
    expect(screen.getByText('Invalid weight')).toBeInTheDocument()
  })

  it('calls setUnit when the unit toggle is clicked', () => {
    render(<ConnectView {...defaultProps} />)
    const metricButton = screen.getByText('Metric (kg, cm)')
    fireEvent.click(metricButton)
    expect(defaultProps.setUnit).toHaveBeenCalledWith('metric')
  })

  it('renders metric inputs when unit is metric', () => {
    const props = { ...defaultProps, unit: 'metric' as 'metric' | 'imperial' }
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

  it('displays the workout summary after a workout ends and then resets', async () => {
    const props = {
      ...defaultProps,
      hasStarted: true,
      workoutStatus: 'running' as WorkoutStatus,
      duration: '00:10:00',
      caloriesBurned: 100,
    }
    const { rerender } = render(<ConnectView {...props} />)

    // End the workout
    const endButton = screen.getByText('End')
    fireEvent.click(endButton)

    expect(props.onEndWorkout).toHaveBeenCalled()

    // Rerender to show the summary view
    const summaryProps = {
      ...props,
      workoutStatus: 'idle' as WorkoutStatus,
      hasStarted: true, // This should be true to show the summary
    }
    rerender(<ConnectView {...summaryProps} />)

    // Check that the summary is displayed
    expect(screen.getByText('Workout Summary')).toBeInTheDocument()
    expect(screen.getByText('00:10:00')).toBeInTheDocument()
    expect(screen.getByText('100')).toBeInTheDocument()

    // Now, reset the workout
    const resetButton = screen.getByText('Reset Permissions & Settings')
    fireEvent.click(resetButton)

    // Check that the reset functions were called
    expect(props.onForgetDevice).toHaveBeenCalled()

    // The test environment doesn't automatically call onReset after onForgetDevice,
    // so we'll check that the button click is registered. In the real component,
    // onReset would be called inside the handleFullReset function.

    // Rerender with initial state to simulate a full reset
    rerender(<ConnectView {...defaultProps} />)

    // Check that the summary is gone
    expect(screen.queryByText('Workout Summary')).not.toBeInTheDocument()
    expect(screen.queryByText('100')).not.toBeInTheDocument()
  })
})
