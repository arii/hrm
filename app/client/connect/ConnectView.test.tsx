/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent } from '@testing-library/react'
import ConnectView from './ConnectView'

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
    workoutStatus: 'idle' as 'idle' | 'running' | 'paused',
    onStartWorkout: jest.fn(),
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

  it('updates the user name when the user types in the name field', () => {
    render(<ConnectView {...defaultProps} />)
    const nameInput = screen.getByLabelText('Your Name')
    fireEvent.change(nameInput, { target: { value: 'Jane Doe' } })
    expect(defaultProps.setUserName).toHaveBeenCalledWith('Jane Doe')
  })

  it('updates the user age when the user types in the age field', () => {
    render(<ConnectView {...defaultProps} />)
    const ageInput = screen.getByLabelText('Your Age')
    fireEvent.change(ageInput, { target: { value: '31' } })
    expect(defaultProps.setUserAge).toHaveBeenCalledWith('31')
  })

  it('updates the user weight when the user types in the weight field', () => {
    render(<ConnectView {...defaultProps} />)
    const weightInput = screen.getByLabelText('Your Weight (lbs)')
    fireEvent.change(weightInput, { target: { value: '160' } })
    expect(defaultProps.setUserWeight).toHaveBeenCalledWith('160')
  })

  it('shows an error when age is invalid', () => {
    const props = { ...defaultProps, ageError: 'Invalid age' }
    render(<ConnectView {...props} />)
    expect(screen.getByText('Invalid age')).toBeInTheDocument()
  })

  it('shows an error when height is invalid', () => {
    const props = { ...defaultProps, heightError: 'Invalid height' }
    render(<ConnectView {...props} />)
    expect(screen.getByText('Invalid height')).toBeInTheDocument()
  })

  it('shows an error when weight is invalid', () => {
    const props = { ...defaultProps, weightError: 'Invalid weight' }
    render(<ConnectView {...props} />)
    expect(screen.getByText('Invalid weight')).toBeInTheDocument()
  })
})
