
/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react'
import useBluetoothHRM from '../../../hooks/useBluetoothHRM'
import { useWebSocket } from '../../../context/WebSocketContext'

jest.mock('../../../context/WebSocketContext', () => ({
  useWebSocket: jest.fn(),
}))

describe('useBluetoothHRM', () => {
  let sendDataMock: jest.Mock
  let mockGatt: any
  let mockCharacteristic: any
  let mockDevice: any
  let mockServer: any

  beforeEach(() => {
    sendDataMock = jest.fn()
    ;(useWebSocket as jest.Mock).mockReturnValue({
      sendData: sendDataMock,
      connectionStatus: 'Connected',
    })

    mockCharacteristic = {
      startNotifications: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }

    mockServer = {
      getPrimaryService: jest.fn().mockResolvedValue({
        getCharacteristic: jest.fn().mockResolvedValue(mockCharacteristic),
      }),
    }

    mockGatt = {
      connect: jest.fn().mockResolvedValue(mockServer),
      disconnect: jest.fn(),
    }

    mockDevice = {
      id: 'test-device-id',
      name: 'Test HRM',
      gatt: mockGatt,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }

    global.navigator.bluetooth = {
      requestDevice: jest.fn().mockResolvedValue(mockDevice),
    } as any
  })

  it('should send a null HRM value on disconnection', async () => {
    const { result } = renderHook(() => useBluetoothHRM())

    await act(async () => {
      await result.current.connectAndStream()
    })

    const onDisconnectedCallback = mockDevice.addEventListener.mock.calls.find(
      (call: any) => call[0] === 'gattserverdisconnected'
    )[1]

    act(() => {
      onDisconnectedCallback()
    })

    expect(sendDataMock).toHaveBeenCalledWith({
      type: 'HRM_INPUT',
      data: { value: null },
    })
  })
})
