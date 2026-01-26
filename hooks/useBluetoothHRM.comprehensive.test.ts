/**
 * @jest-environment jsdom
 */
import { renderHook, act, waitFor } from '@testing-library/react'
import useBluetoothHRM from './useBluetoothHRM'
import * as WebSocketContext from '../context/WebSocketContext'
import * as cookieUtils from '../utils/cookies'

// Mock dependencies
jest.mock('@/context/WebSocketContext')
jest.mock('@/utils/cookies')
jest.mock('@/utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}))

describe('useBluetoothHRM Comprehensive Tests', () => {
  let mockGattServer: {
    getPrimaryService: jest.Mock
    disconnect: jest.Mock
    connect: jest.Mock
  }
  let mockDevice: {
    id: string
    name: string
    gatt: {
        connect: jest.Mock<any, any, any>;
        disconnect: jest.Mock<any, any, any>;
    }
    addEventListener: jest.Mock
    removeEventListener: jest.Mock
  }
  let mockBluetooth: {
    requestDevice: jest.Mock
    getDevices: jest.Mock
  }
  let characteristicValueChangedCallback: (event: unknown) => void
  let gattServerDisconnectedCallback: () => void

  beforeEach(() => {
    jest.useFakeTimers()
    jest.clearAllMocks()

    // Mock WebSocket context
    jest.spyOn(WebSocketContext, 'useWebSocket').mockReturnValue({
      sendData: jest.fn(),
      connectionStatus: 'Connected',
      hrmData: [],
      timerData: {
        phase: 'idle',
        timeRemaining: 0,
        currentRound: 0,
        totalRounds: 0,
      },
      spotifyData: null,
      workoutData: {
        totalCalories: 0,
        workoutDuration: 0,
      },
      lastJsonMessage: null,
    })

    // Mock cookie functions
    jest.spyOn(cookieUtils, 'getCookie').mockReturnValue('')
    jest.spyOn(cookieUtils, 'setCookie').mockImplementation(() => {})

    // Mock Bluetooth device and characteristics
    const mockCharacteristic = {
      startNotifications: jest.fn().mockResolvedValue(undefined),
      addEventListener: jest.fn((event, callback) => {
        if (event === 'characteristicvaluechanged') {
          characteristicValueChangedCallback = callback
        }
      }),
      removeEventListener: jest.fn(),
    }

    const mockPrimaryService = {
      getCharacteristic: jest.fn().mockResolvedValue(mockCharacteristic),
    }

    mockGattServer = {
      connect: jest.fn().mockResolvedValue(mockGattServer),
      disconnect: jest.fn(),
      getPrimaryService: jest.fn().mockResolvedValue(mockPrimaryService),
    }

    mockDevice = {
      id: 'test-device-id',
      name: 'Test HRM',
      gatt: {
        connect: jest.fn().mockResolvedValue(mockGattServer),
        disconnect: jest.fn(() => {
            if (gattServerDisconnectedCallback) {
                gattServerDisconnectedCallback();
            }
        }),
      },
      addEventListener: jest.fn((event, callback) => {
        if (event === 'gattserverdisconnected') {
          gattServerDisconnectedCallback = callback
        }
      }),
      removeEventListener: jest.fn(),
    }

    mockBluetooth = {
      requestDevice: jest.fn().mockResolvedValue(mockDevice),
      getDevices: jest.fn().mockResolvedValue([]),
    }

    Object.defineProperty(navigator, 'bluetooth', {
      value: mockBluetooth,
      writable: true,
      configurable: true,
    })
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  // Test cases will go here
  test('should set isDataStale and attempt to reconnect when data is not received within dataLivenessTimeoutMs', async () => {
    const dataLivenessTimeoutMs = 5000
    const { result } = renderHook(() =>
      useBluetoothHRM({ dataLivenessTimeoutMs })
    )

    // Connect to the device
    await act(async () => {
      await result.current.connectAndStream()
    })

    // Simulate receiving one heart rate packet to start the timer
    act(() => {
      characteristicValueChangedCallback({
        target: { value: new DataView(new ArrayBuffer(2)) },
      })
    })

    expect(result.current.isDataStale).toBe(false)

    // Advance time just past the liveness timeout
    await act(async () => {
      jest.advanceTimersByTime(dataLivenessTimeoutMs + 100)
    })

    // Verify that the data is considered stale and reconnection is triggered
    await waitFor(() => {
      expect(result.current.isDataStale).toBe(true)
      expect(result.current.deviceStatus).toBe(
        'Connection unstable. Reconnecting...'
      )
      expect(mockDevice.gatt.disconnect).toHaveBeenCalledTimes(1)
    })
  })
})
