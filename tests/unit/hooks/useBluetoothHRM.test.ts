/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react'
import useBluetoothHRM from '@/hooks/useBluetoothHRM'
import * as useGattConnection from '@/hooks/useGattConnection'
import * as useGattCharacteristics from '@/hooks/useGattCharacteristics'
import * as useReconnection from '@/hooks/useReconnection'
import * as WebSocketContext from '@/context/WebSocketContext'

jest.mock('@/hooks/useGattConnection')
jest.mock('@/hooks/useGattCharacteristics')
jest.mock('@/hooks/useReconnection')
jest.mock('@/context/WebSocketContext')
jest.useFakeTimers()

describe('useBluetoothHRM', () => {
  const mockConnect = jest.fn()
  const mockDisconnect = jest.fn()
  const mockSetupCharacteristics = jest.fn()
  const mockStartReconnecting = jest.fn()

  let mockGattConnectionState: ReturnType<typeof useGattConnection.useGattConnection>
  let onHeartRateUpdateCallback: (hr: number) => void

  beforeEach(() => {
    jest.clearAllMocks()

    mockGattConnectionState = {
      status: 'disconnected',
      server: {} as BluetoothRemoteGATTServer,
      connect: mockConnect.mockImplementation(async () => {
        mockGattConnectionState.status = 'connected'
        return {} as BluetoothRemoteGATTServer
      }),
      disconnect: mockDisconnect.mockImplementation(() => {
        mockGattConnectionState.status = 'disconnected'
      }),
      error: null,
    }

    jest
      .spyOn(useGattConnection, 'useGattConnection')
      .mockImplementation(() => mockGattConnectionState)

    jest
      .spyOn(useGattCharacteristics, 'useGattCharacteristics')
      .mockImplementation(({ onHeartRateUpdate }) => {
        onHeartRateUpdateCallback = onHeartRateUpdate!
        return {
          setupCharacteristics: mockSetupCharacteristics,
          batteryLevel: 75,
        }
      })

    jest.spyOn(useReconnection, 'useReconnection').mockReturnValue({
      startReconnecting: mockStartReconnecting,
      stopReconnecting: jest.fn(),
      isReconnecting: false,
      reconnectionStatus: null,
      reconnectionReason: null,
    })
    ;(WebSocketContext as jest.Mocked<typeof WebSocketContext>).useWebSocket.mockReturnValue({
      sendData: jest.fn(),
      connectionStatus: 'Connected',
      lastJsonMessage: null,
      hrmData: [],
      timerData: { phase: 'idle', timeRemaining: 0, currentRound: 0, totalRounds: 0 },
      spotifyData: null,
      workoutData: null,
    })

    Object.defineProperty(navigator, 'bluetooth', {
      value: { requestDevice: jest.fn() },
      configurable: true,
    })
  })

  it('should connect and stream', async () => {
    const mockDevice = {
      name: 'Test Device',
      addEventListener: jest.fn(),
    }
    ;(navigator.bluetooth.requestDevice as jest.Mock).mockResolvedValue(
      mockDevice
    )

    const { result, rerender } = renderHook(() => useBluetoothHRM({}))

    await act(async () => {
      await result.current.connectAndStream()
      rerender() // Rerender to get the new 'connected' status
    })

    expect(mockConnect).toHaveBeenCalledWith(mockDevice)
    expect(mockSetupCharacteristics).toHaveBeenCalled()
  })

  it('should trigger reconnect on data liveness timeout', async () => {
    const mockDevice = { addEventListener: jest.fn() }
    ;(navigator.bluetooth.requestDevice as jest.Mock).mockResolvedValue(
      mockDevice
    )
    const { result, rerender } = renderHook(() =>
      useBluetoothHRM({ dataLivenessTimeoutMs: 5000 })
    )

    // Simulate connection and first HR update
    await act(async () => {
      await result.current.connectAndStream()
      rerender()
      onHeartRateUpdateCallback(70)
    })

    await act(async () => {
      jest.advanceTimersByTime(6000)
    })

    expect(mockDisconnect).toHaveBeenCalled()
  })

  it('should call startReconnecting with the correct reason on unexpected disconnect', async () => {
    const mockDevice = {
      name: 'Test Device',
      addEventListener: jest.fn(),
    }
    ;(navigator.bluetooth.requestDevice as jest.Mock).mockResolvedValue(
      mockDevice
    )

    const { result, rerender } = renderHook(() => useBluetoothHRM({}))

    await act(async () => {
      await result.current.connectAndStream()
      rerender()
    })

    const onDisconnected = mockDevice.addEventListener.mock.calls[0][1]

    act(() => {
      onDisconnected()
    })

    expect(mockStartReconnecting).toHaveBeenCalledWith('signal_loss')
  })
})
