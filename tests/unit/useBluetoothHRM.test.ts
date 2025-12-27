/**
 * @jest-environment jsdom
 */
import { jest } from '@jest/globals'
import { renderHook, act } from '@testing-library/react'
import useBluetoothHRM from '@/hooks/useBluetoothHRM'
import { useWebSocket } from '@/context/WebSocketContext'
import { BluetoothDeviceManager } from '@/services/bluetoothDeviceManager'

// Mock the WebSocket context
jest.mock('@/context/WebSocketContext', () => ({
  useWebSocket: jest.fn(),
}))

// Mock the BluetoothDeviceManager
jest.mock('@/services/bluetoothDeviceManager')

describe('useBluetoothHRM', () => {
  let mockSendData: jest.Mock
  let mockDeviceManager: jest.Mocked<BluetoothDeviceManager>

  beforeEach(() => {
    mockSendData = jest.fn()
    ;(useWebSocket as jest.Mock).mockReturnValue({
      sendData: mockSendData,
      connectionStatus: 'Connected',
    })

    // Create a mock instance of the device manager
    mockDeviceManager = new (BluetoothDeviceManager as jest.Mock<
      () => BluetoothDeviceManager
    >)() as jest.Mocked<BluetoothDeviceManager>
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should connect and update status', async () => {
    const { result } = renderHook(() => useBluetoothHRM(mockDeviceManager))

    await act(async () => {
      await result.current.connect('Test User', 30)
    })

    expect(mockDeviceManager.connect).toHaveBeenCalled()
  })

  it('should disconnect and update status', async () => {
    const { result } = renderHook(() => useBluetoothHRM(mockDeviceManager))

    await act(async () => {
      await result.current.connect('Test User', 30)
    })

    act(() => {
      result.current.disconnect()
    })

    expect(mockDeviceManager.disconnect).toHaveBeenCalled()
  })

  it('should forget a device', async () => {
    const { result } = renderHook(() => useBluetoothHRM(mockDeviceManager))

    await act(async () => {
      await result.current.forgetDevice()
    })

    expect(mockDeviceManager.forgetDevice).toHaveBeenCalled()
  })
})
