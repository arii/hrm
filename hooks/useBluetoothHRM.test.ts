/** @jest-environment jsdom */
import { renderHook, act } from '@testing-library/react'
import useBluetoothHRM from '@/hooks/useBluetoothHRM'
import { useWebSocket } from '@/context/WebSocketContext'
import useBluetoothConnection from '@/hooks/useBluetoothConnection'
import useGattSubscription from '@/hooks/useGattSubscription'
import useDataLiveness from '@/hooks/useDataLiveness'
import useSignalQuality from '@/hooks/useSignalQuality'

// Mock the smaller hooks
jest.mock('@/hooks/useBluetoothConnection')
jest.mock('@/hooks/useGattSubscription')
jest.mock('@/hooks/useDataLiveness')
jest.mock('@/hooks/useSignalQuality')
// Mock websocket context
jest.mock('@/context/WebSocketContext')

const mockUseBluetoothConnection = useBluetoothConnection as jest.Mock
const mockUseGattSubscription = useGattSubscription as jest.Mock
const mockUseDataLiveness = useDataLiveness as jest.Mock
const mockUseSignalQuality = useSignalQuality as jest.Mock
const mockUseWebSocket = useWebSocket as jest.Mock

describe('useBluetoothHRM', () => {
  let mockSendData: jest.Mock

  beforeEach(() => {
    // Reset mocks before each test
    mockSendData = jest.fn()

    mockUseWebSocket.mockReturnValue({
      sendData: mockSendData,
      connectionStatus: 'Connected',
    })

    // Default mock implementations for the sub-hooks
    mockUseBluetoothConnection.mockReturnValue({
      connect: jest.fn().mockResolvedValue(undefined),
      autoConnect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn(),
      forgetDevice: jest.fn(),
      deviceStatus: 'Disconnected',
      isConnected: false,
      isSupported: true,
      device: { name: 'Test Device' },
    })

    mockUseGattSubscription.mockReturnValue({
      batteryLevel: null,
      lastDataTimestamp: 0,
    })

    mockUseDataLiveness.mockReturnValue({
      isDataStale: false,
    })

    mockUseSignalQuality.mockReturnValue({
      signalPeriodMs: 0,
    })
  })

  it('should initialize and return the combined state of all sub-hooks', () => {
    mockUseBluetoothConnection.mockReturnValue({
      deviceStatus: 'Mock Status',
      isConnected: false,
      isSupported: true,
      device: { name: 'Test' },
    })
    mockUseGattSubscription.mockReturnValue({
      batteryLevel: 88,
      lastDataTimestamp: 1,
    })
    mockUseDataLiveness.mockReturnValue({ isDataStale: true })
    mockUseSignalQuality.mockReturnValue({ signalPeriodMs: 123 })

    const { result } = renderHook(() => useBluetoothHRM({}))

    expect(result.current.deviceStatus).toBe('Mock Status')
    expect(result.current.isConnected).toBe(false)
    expect(result.current.batteryLevel).toBe(88)
    expect(result.current.isDataStale).toBe(true)
    expect(result.current.signalPeriodMs).toBe(123)
    expect(result.current.isSupported).toBe(true)
  })

  it('should call the connection hook connect method on connectAndStream', async () => {
    const mockConnect = jest.fn().mockResolvedValue(undefined)
    mockUseBluetoothConnection.mockReturnValue({
      ...mockUseBluetoothConnection(),
      connect: mockConnect,
    })

    const { result } = renderHook(() => useBluetoothHRM({}))

    await act(async () => {
      await result.current.connectAndStream('Test User', 30)
    })

    expect(mockConnect).toHaveBeenCalled()
  })

  it('should throw an error if WebSocket is not connected during connectAndStream', async () => {
    mockUseWebSocket.mockReturnValue({
      sendData: mockSendData,
      connectionStatus: 'Disconnected',
    })

    const { result } = renderHook(() => useBluetoothHRM({}))

    await act(async () => {
      await expect(result.current.connectAndStream()).rejects.toThrow(
        'WebSocket not connected'
      )
    })
  })

  it('should call the connection hook disconnect method and send null HR on disconnect', () => {
    const mockDisconnect = jest.fn()
    mockUseBluetoothConnection.mockReturnValue({
      ...mockUseBluetoothConnection(),
      disconnect: mockDisconnect,
    })

    const { result } = renderHook(() => useBluetoothHRM({}))

    act(() => {
      result.current.disconnect()
    })

    expect(mockDisconnect).toHaveBeenCalled()
  })

  it('should send metadata when connected', () => {
    mockUseBluetoothConnection.mockReturnValue({
      ...mockUseBluetoothConnection(),
      isConnected: true,
      device: { name: 'HRM Pro' },
    })

    renderHook(() => useBluetoothHRM({ userName: 'Jest', userAge: 25 }))

    expect(mockSendData).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'HRM_METADATA_UPDATE',
      })
    )
  })

  it('should forward heart rate updates from gatt subscription and send to websocket', () => {
    const onHeartRateUpdate = jest.fn()
    renderHook(() => useBluetoothHRM({ onHeartRateUpdate }))

    const gattSubscriptionProps = mockUseGattSubscription.mock.calls[0][0]

    act(() => {
      gattSubscriptionProps.onHeartRateUpdate(80)
    })

    expect(onHeartRateUpdate).toHaveBeenCalledWith(80)
    expect(mockSendData).toHaveBeenCalledWith({
      type: 'HRM_INPUT',
      data: { value: 80 },
    })
  })
})
