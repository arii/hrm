/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import HrmTiles from '@/components/HrmTiles'
import useBluetoothHRM from '@/hooks/useBluetoothHRM'
import { useWebSocket } from '@/context/WebSocketContext'

jest.mock('@/hooks/useBluetoothHRM')
jest.mock('@/context/WebSocketContext')

const mockUseBluetoothHRM = useBluetoothHRM as jest.Mock
const mockUseWebSocket = useWebSocket as jest.Mock

describe('HrmTiles', () => {
  beforeEach(() => {
    // Reset mocks before each test
    mockUseBluetoothHRM.mockClear()
    mockUseWebSocket.mockClear()
  })

  it('renders the disconnection chip when bluetooth is disconnected', () => {
    // Arrange: Mock the hooks' return values
    mockUseBluetoothHRM.mockReturnValue({
      deviceStatus: 'Disconnected',
    })
    mockUseWebSocket.mockReturnValue({
      hrmData: [],
      connectionStatus: 'Connected',
      activeAlerts: [],
    })

    // Act: Render the component
    render(<HrmTiles />)

    // Assert: Check that the disconnection indicator is visible
    expect(screen.getByText('Bluetooth Disconnected')).toBeInTheDocument()
  })

  it('does not render the disconnection chip when bluetooth is connected', () => {
    // Arrange: Mock the hooks' return values
    mockUseBluetoothHRM.mockReturnValue({
      deviceStatus: 'Connected',
    })
    mockUseWebSocket.mockReturnValue({
      hrmData: [],
      connectionStatus: 'Connected',
      activeAlerts: [],
    })

    // Act: Render the component
    render(<HrmTiles />)

    // Assert: Check that the disconnection indicator is not visible
    expect(screen.queryByText('Bluetooth Disconnected')).not.toBeInTheDocument()
  })
})
