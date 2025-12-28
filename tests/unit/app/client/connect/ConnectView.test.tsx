/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import ConnectView from '../../../../../app/client/connect/ConnectView'
import { MeasurementSystem, Gender } from '../../../../../types'

// Mock child components to isolate the ConnectView logic
jest.mock('../../../../../app/client/connect/UserSettings', () => (props) => (
  <div data-testid="user-settings" {...props} />
))
jest.mock(
  '../../../../../app/client/connect/ConnectionManager',
  () => (props) => <div data-testid="connection-manager" {...props} />
)
jest.mock(
  '../../../../../app/client/connect/WorkoutManager',
  () => (props) => <div data-testid="workout-manager" {...props} />
)
jest.mock('../../../../../components/BottomNavBar', () => () => (
  <div data-testid="bottom-nav-bar" />
))

describe('ConnectView', () => {
  const defaultProps = {
    userName: 'Test User',
    setUserName: jest.fn(),
    userAge: '30',
    setUserAge: jest.fn(),
    weightInKg: '70',
    setWeightInKg: jest.fn(),
    heightInCm: '175',
    setHeightInCm: jest.fn(),
    gender: 'MALE' as Gender,
    setGender: jest.fn(),
    unitSystem: 'IMPERIAL' as MeasurementSystem,
    setUnitSystem: jest.fn(),
    isConnected: false,
    isSupported: true,
    deviceStatus: 'Disconnected',
    batteryLevel: null,
    currentHR: 0,
    hrZoneProps: { percentage: 0, progressColor: 'grey' },
    connectionStatus: 'Disconnected',
    onConnect: jest.fn(),
    onDisconnect: jest.fn(),
    onForgetDevice: jest.fn().mockResolvedValue(undefined),
    disconnectionReason: null,
    workoutDuration: 0,
    calories: 0,
    hasStarted: false,
    workoutStatus: 'idle' as 'idle' | 'running' | 'paused',
    startWorkout: jest.fn(),
    endWorkout: jest.fn(),
    resetWorkout: jest.fn(),
  }

  it('renders UserSettings when not connected and workout has not started', () => {
    render(<ConnectView {...defaultProps} />)
    expect(screen.getByTestId('user-settings')).toBeInTheDocument()
  })

  it('hides UserSettings and shows user details when connected', () => {
    render(<ConnectView {...defaultProps} isConnected={true} />)
    expect(screen.queryByTestId('user-settings')).not.toBeInTheDocument()
    expect(screen.getByText('Connected as')).toBeInTheDocument()
    expect(screen.getByText('Test User')).toBeInTheDocument()
  })

  it('renders ConnectionManager, WorkoutManager, and BottomNavBar', () => {
    render(<ConnectView {...defaultProps} />)
    expect(screen.getByTestId('connection-manager')).toBeInTheDocument()
    expect(screen.getByTestId('workout-manager')).toBeInTheDocument()
    expect(screen.getByTestId('bottom-nav-bar')).toBeInTheDocument()
  })

  it('displays a "Bluetooth Not Supported" message when not supported', () => {
    render(<ConnectView {...defaultProps} isSupported={false} />)
    expect(screen.getByText('Bluetooth Not Supported')).toBeInTheDocument()
    // Ensure other components are not rendered
    expect(
      screen.queryByTestId('connection-manager')
    ).not.toBeInTheDocument()
  })
})
