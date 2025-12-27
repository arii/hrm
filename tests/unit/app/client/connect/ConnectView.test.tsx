/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import ConnectView from '../../../../../app/client/connect/ConnectView'

// Mock child components to isolate the ConnectView logic
jest.mock('../../../../../app/client/connect/UserSettings', () => () => (
  <div data-testid="user-settings" />
))

// Correctly mock ConnectionManager to expose the prop for testing
jest.mock(
  '../../../../../app/client/connect/ConnectionManager',
  () =>
    function MockConnectionManager(props) {
      const { isConnectable, ...rest } = props
      return (
        <div
          data-testid="connection-manager"
          data-isconnectable={isConnectable}
          {...rest}
        />
      )
    }
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
    userAge: '30',
    weightInKg: '70',
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

  it('passes the correct `isConnectable` prop to ConnectionManager', () => {
    // Should be connectable when userName and userAge are present
    const { rerender } = render(<ConnectView {...defaultProps} />)
    const connectionManager = screen.getByTestId('connection-manager')
    expect(connectionManager).toHaveAttribute('data-isconnectable', 'true')

    // Should not be connectable if userName is missing
    rerender(<ConnectView {...defaultProps} userName="" />)
    expect(connectionManager).toHaveAttribute('data-isconnectable', 'false')

    // Should not be connectable if userAge is missing
    rerender(<ConnectView {...defaultProps} userAge="" />)
    expect(connectionManager).toHaveAttribute('data-isconnectable', 'false')
  })
})
