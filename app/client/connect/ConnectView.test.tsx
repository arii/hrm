/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent } from '@testing-library/react'
import ConnectView from './ConnectView'
import { Gender, MeasurementSystem } from '../../../types/core'

describe('ConnectView', () => {
  const defaultProps = {
    duration: '00:00:00',
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
    userWeight: '154',
    setUserWeight: jest.fn(),
    onWeightBlur: jest.fn(),
    weightError: null,
    gender: 'MALE' as Gender,
    setGender: jest.fn(),
    unitSystem: 'IMPERIAL' as MeasurementSystem,
    onUnitChange: jest.fn(),
    isConnected: false,
    isDataStale: false,
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
    workoutStatus: 'idle' as 'idle' | 'running' | 'paused',
    onStartWorkout: jest.fn(),
    onPauseWorkout: jest.fn(),
    onEndWorkout: jest.fn(),
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

  it('calls onUnitChange when the unit toggle is clicked', () => {
    render(<ConnectView {...defaultProps} />)
    const metricButton = screen.getByText('Metric (kg)')
    fireEvent.click(metricButton)
    expect(defaultProps.onUnitChange).toHaveBeenCalledWith('METRIC')
  })

  it('renders metric inputs when unit is metric', () => {
    const props = { ...defaultProps, unitSystem: 'METRIC' as MeasurementSystem }
    render(<ConnectView {...props} />)
    // These labels are inside the UserSettings component
    expect(screen.getByLabelText('Your Height (cm)')).toBeInTheDocument()
    expect(screen.getByLabelText('Your Weight (kg)')).toBeInTheDocument()
  })

  it('renders imperial inputs when unit is imperial', () => {
    render(<ConnectView {...defaultProps} />)
    // These labels are inside the UserSettings component
    expect(screen.getByLabelText('Feet')).toBeInTheDocument()
    expect(screen.getByLabelText('Inches')).toBeInTheDocument()
    expect(screen.getByLabelText('Your Weight (lbs)')).toBeInTheDocument()
  })

  it('calls setGender when a gender radio button is clicked', () => {
    render(<ConnectView {...defaultProps} />)
    const femaleRadio = screen.getByLabelText('Female')
    fireEvent.click(femaleRadio)
    expect(defaultProps.setGender).toHaveBeenCalledWith('FEMALE')
  })
})
