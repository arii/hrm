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
    setUserName: vi.fn(),
    userAge: '30',
    setUserAge: vi.fn(),
    userHeight: '5.9',
    setUserHeight: vi.fn(),
    userWeight: '154',
    setUserWeight: vi.fn(),
    unit: 'imperial' as 'metric' | 'imperial',
    setUnit: vi.fn(),
    ageError: null,
    heightError: null,
    weightError: null,
    validateAge: vi.fn(),
    validateHeight: vi.fn(),
    validateWeight: vi.fn(),
    isConnected: false,
    deviceStatus: 'Disconnected',
    batteryLevel: null,
    onConnect: vi.fn(),
    onDisconnect: vi.fn(),
    onForgetDevice: vi.fn().mockResolvedValue(undefined),
    isSupported: true,
    currentHR: 0,
    hrZoneProps: { percentage: 0, progressColor: 'grey' },
    connectionStatus: 'Disconnected',
    bluetoothConnected: false,
    hasStarted: false,
    onReset: vi.fn(),
    workoutStatus: 'idle' as 'idle' | 'running' | 'paused',
    onStartWorkout: vi.fn(),
    onEndWorkout: vi.fn(),
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
})
