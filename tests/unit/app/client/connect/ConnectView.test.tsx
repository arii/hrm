/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent } from '@testing-library/react'
import ConnectView from '@/app/client/connect/ConnectView'
import { UserSettingsProvider } from '@/context/UserSettingsContext'
import { WebSocketProvider } from '@/context/WebSocketContext'
import '@testing-library/jest-dom'

// Mock child components and hooks that are not the focus of this test.
jest.mock('@/hooks/useBluetoothHRM', () => ({
  __esModule: true,
  default: () => ({
    status: 'DISCONNECTED',
    hrData: { heartRate: 0, rrIntervals: [] },
    error: null,
    connect: jest.fn(),
    disconnect: jest.fn(),
    deviceName: null,
  }),
}))

jest.mock('@/hooks/useHrmBroadcaster', () => ({
  useHrmBroadcaster: jest.fn(),
}))

jest.mock('@/hooks/useAutoConnect', () => ({
  useAutoConnect: jest.fn(),
}))

jest.mock('@/app/client/connect/DeviceConnection', () => ({
  __esModule: true,
  DeviceConnection: () => <div data-testid="mock-device-connection" />,
}))

jest.mock('@/app/client/connect/WorkoutControls', () => ({
  __esModule: true,
  default: () => <div data-testid="mock-workout-controls" />,
}))

describe('ConnectView', () => {
  // A helper function to render the component with all necessary providers
  const renderWithProviders = (ui: React.ReactElement) => {
    return render(
      <WebSocketProvider>
        <UserSettingsProvider>{ui}</UserSettingsProvider>
      </WebSocketProvider>
    )
  }

  it('renders the main heading', () => {
    renderWithProviders(<ConnectView />)
    expect(
      screen.getByRole('heading', { name: /Connect & Settings/i })
    ).toBeInTheDocument()
  })

  it('renders the DeviceConnection component', () => {
    renderWithProviders(<ConnectView />)
    expect(screen.getByTestId('mock-device-connection')).toBeInTheDocument()
  })

  it('renders the user settings form fields', () => {
    renderWithProviders(<ConnectView />)
    expect(screen.getByLabelText(/Name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Age/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Weight/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Height/i)).toBeInTheDocument()
    expect(screen.getByText(/Measurement System/i)).toBeInTheDocument()
    expect(screen.getByText(/Gender/i)).toBeInTheDocument()
  })

  it('renders the WorkoutControls component', () => {
    renderWithProviders(<ConnectView />)
    expect(screen.getByTestId('mock-workout-controls')).toBeInTheDocument()
  })

  it('allows user to input their name', () => {
    renderWithProviders(<ConnectView />)
    const nameInput = screen.getByLabelText(/Name/i)
    fireEvent.change(nameInput, { target: { value: 'John Doe' } })
    expect(nameInput).toHaveValue('John Doe')
  })
})
