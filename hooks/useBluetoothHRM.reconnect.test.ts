import { act, renderHook } from '@testing-library/react-hooks'
import useBluetoothHRM from '@/hooks/useBluetoothHRM'
import { useWebSocket } from '@/context/WebSocketContext'

jest.mock('@/context/WebSocketContext', () => ({
  useWebSocket: jest.fn(),
}))

const mockUseWebSocket = useWebSocket as jest.Mock

describe('useBluetoothHRM Reconnection', () => {
  let mockSendData: jest.Mock

  beforeEach(() => {
    mockSendData = jest.fn()
    mockUseWebSocket.mockReturnValue({
      sendData: mockSendData,
      connectionStatus: 'Connected',
    })
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.clearAllMocks()
  })

  it('should attempt to reconnect after an unexpected disconnection', async () => {
    const mockDevice = {
      gatt: {
        connect: jest.fn().mockResolvedValue({
          getPrimaryService: jest.fn().mockResolvedValue({
            getCharacteristic: jest.fn().mockResolvedValue({
              startNotifications: jest.fn(),
              addEventListener: jest.fn(),
            }),
          }),
        }),
        disconnect: jest.fn(),
      },
      addEventListener: jest.fn(),
    }
    ;(navigator as any).bluetooth = {
      requestDevice: jest.fn().mockResolvedValue(mockDevice),
    }

    const { result, waitFor } = renderHook(() => useBluetoothHRM())

    await act(async () => {
      await result.current.connectAndStream()
    })

    act(() => {
      // Manually trigger the disconnected event
      const disconnectedCallback = mockDevice.addEventListener.mock.calls.find(
        (call) => call[0] === 'gattserverdisconnected'
      )[1]
      disconnectedCallback()
    })

    await waitFor(() => {
      expect(result.current.deviceStatus).toContain('Reconnecting')
    })
  })

  it('should give up after max reconnect attempts', async () => {
    const mockDevice = {
      gatt: {
        connect: jest.fn().mockRejectedValue(new Error('Connection failed')),
        disconnect: jest.fn(),
      },
      addEventListener: jest.fn(),
    };
    (navigator as any).bluetooth = {
      requestDevice: jest.fn().mockResolvedValue(mockDevice),
    }

    const { result, waitFor } = renderHook(() => useBluetoothHRM())

    await act(async () => {
      await result.current.connectAndStream()
    })

    // Simulate multiple disconnections
    for (let i = 0; i < 5; i++) {
      act(() => {
        const disconnectedCallback = mockDevice.addEventListener.mock.calls.find(
          (call) => call[0] === 'gattserverdisconnected'
        )[1]
        disconnectedCallback()
      })

      await act(async () => {
        jest.runOnlyPendingTimers()
      })
    }

    await waitFor(() => {
      expect(result.current.deviceStatus).toContain('Failed to reconnect')
    })
  })
})
