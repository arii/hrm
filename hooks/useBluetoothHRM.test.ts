/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react'
import useBluetoothHRM from './useBluetoothHRM'
import * as WebSocketContext from '../context/WebSocketContext'
import * as cookieUtils from '../utils/cookies'

// Mock the WebSocket context
jest.mock('@/context/WebSocketContext')
jest.mock('@/utils/cookies')

// Mock logger
jest.mock('@/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}))

describe('useBluetoothHRM', () => {
  let mockGatt: any
  let mockDevice: any
  let mockBluetooth: any
  let mockCharacteristic: any

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks()
    jest.useRealTimers() // Default to real timers

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

    // Mock Bluetooth device
    mockCharacteristic = {
      startNotifications: jest.fn().mockResolvedValue(undefined),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }

    mockGatt = {
      connect: jest.fn().mockResolvedValue({
        getPrimaryService: jest.fn().mockResolvedValue({
          getCharacteristic: jest.fn().mockResolvedValue(mockCharacteristic),
        }),
      }),
      disconnect: jest.fn(),
      connected: true,
    }

    mockDevice = {
      id: 'test-device-id',
      name: 'Test HRM',
      gatt: mockGatt,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }

    // Mock Web Bluetooth API
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

  it('should not attempt to auto-connect if no device is saved', async () => {
    const { result } = renderHook(() => useBluetoothHRM())

    await act(async () => {
      await result.current.autoConnect()
    })

    expect(mockBluetooth.getDevices).toHaveBeenCalled()
    expect(mockGatt.connect).not.toHaveBeenCalled()
    expect(result.current.deviceStatus).toBe(
      'Auto-connect failed. Use Connect button to select device.'
    )
  })

  it('should auto-connect to a saved device', async () => {
    jest.spyOn(cookieUtils, 'getCookie').mockReturnValue('test-device-id')
    mockBluetooth.getDevices.mockResolvedValue([mockDevice])
    const { result } = renderHook(() => useBluetoothHRM())

    await act(async () => {
      await result.current.autoConnect()
    })

    expect(mockBluetooth.getDevices).toHaveBeenCalled()
    expect(mockGatt.connect).toHaveBeenCalled()
    expect(result.current.deviceStatus).toBe('Connected to: Test HRM')
  })

  it('should handle silent connection failure gracefully', async () => {
    jest.spyOn(cookieUtils, 'getCookie').mockReturnValue('test-device-id')
    mockBluetooth.getDevices.mockResolvedValue([mockDevice])
    mockGatt.connect.mockRejectedValue(new Error('Connection failed'))
    const { result } = renderHook(() => useBluetoothHRM())

    await act(async () => {
      await result.current.autoConnect()
    })

    expect(result.current.deviceStatus).toBe(
      'Auto-connect failed. Use Connect button to select device.'
    )
  })

  it('should not show device picker in silent mode', async () => {
    const { result } = renderHook(() => useBluetoothHRM())

    await act(async () => {
      await result.current.autoConnect()
    })

    expect(mockBluetooth.requestDevice).not.toHaveBeenCalled()
  })

  it('should show device picker in non-silent mode', async () => {
    const { result } = renderHook(() => useBluetoothHRM())

    await act(async () => {
      try {
        await result.current.connectAndStream()
      } catch (_e) {
        // ignore
      }
    })

    expect(mockBluetooth.requestDevice).toHaveBeenCalled()
  })

  it('should abort a pending connection attempt when a new one is initiated', async () => {
    // Mock AbortController to spy on the abort method
    const mockAbort = jest.fn()
    const OriginalAbortController = global.AbortController
    global.AbortController = jest.fn(
      () =>
        ({
          abort: mockAbort,
          signal: { aborted: false },
        }) as unknown as AbortController
    )

    // Make the connect call a promise that we can control, so it stays pending
    let connectResolver: (value: unknown) => void
    const connectPromise = new Promise((resolve) => {
      connectResolver = resolve
    })
    // @ts-expect-error Gatt is a mock
    mockGatt.connect.mockReturnValue(connectPromise)

    const { result } = renderHook(() => useBluetoothHRM())

    // First call, should get stuck in a pending state
    act(() => {
      // We don't await this, so it remains in-flight
      result.current.connectAndStream()
    })

    // Second call, should trigger the abort logic for the first call
    act(() => {
      result.current.connectAndStream()
    })

    // Verify that the abort function was called for the first pending attempt
    expect(mockAbort).toHaveBeenCalledTimes(1)

    // Clean up by resolving the promise to avoid open handles
    await act(async () => {
      connectResolver({
        getPrimaryService: jest.fn().mockResolvedValue({
          getCharacteristic: jest.fn().mockResolvedValue({
            startNotifications: jest.fn().mockResolvedValue(undefined),
            addEventListener: jest.fn(),
          }),
        }),
      })
    })

    // Restore original AbortController
    global.AbortController = OriginalAbortController
  })

  describe('Signal Quality Calculation', () => {
    it('should calculate the rolling average of signal period', async () => {
      const { result } = renderHook(() => useBluetoothHRM())
      let characteristicValueChangedCallback: (
        event: unknown
      ) => void = () => {}

      // Mock the characteristic and capture the event listener
      const mockCharacteristic = {
        startNotifications: jest.fn().mockResolvedValue(undefined),
        addEventListener: jest.fn((_event, callback) => {
          characteristicValueChangedCallback = callback
        }),
      }

      // @ts-expect-error Gatt is a mock
      mockGatt.connect.mockResolvedValue({
        getPrimaryService: jest.fn().mockResolvedValue({
          getCharacteristic: jest.fn().mockResolvedValue(mockCharacteristic),
        }),
      })

      await act(async () => {
        await result.current.connectAndStream()
      })

      // Simulate packet arrivals
      const now = Date.now()
      jest.spyOn(Date, 'now').mockReturnValue(now)

      // First packet
      act(() => {
        characteristicValueChangedCallback({
          target: { value: new DataView(new ArrayBuffer(2)) },
        })
      })

      // Second packet after 1000ms
      jest.spyOn(Date, 'now').mockReturnValue(now + 1000)
      act(() => {
        characteristicValueChangedCallback({
          target: { value: new DataView(new ArrayBuffer(2)) },
        })
      })

      expect(result.current.signalPeriodMs).toBe(1000)

      // Third packet after 1050ms
      jest.spyOn(Date, 'now').mockReturnValue(now + 2050)
      act(() => {
        characteristicValueChangedCallback({
          target: { value: new DataView(new ArrayBuffer(2)) },
        })
      })
      // Average of 1000 and 1050 is 1025
      expect(result.current.signalPeriodMs).toBe(1025)

      // Simulate a few more packets to test the rolling average
      jest.spyOn(Date, 'now').mockReturnValue(now + 3050) // 1000ms delta
      act(() => {
        characteristicValueChangedCallback({
          target: { value: new DataView(new ArrayBuffer(2)) },
        })
      })
      jest.spyOn(Date, 'now').mockReturnValue(now + 4050) // 1000ms delta
      act(() => {
        characteristicValueChangedCallback({
          target: { value: new DataView(new ArrayBuffer(2)) },
        })
      })
      jest.spyOn(Date, 'now').mockReturnValue(now + 5050) // 1000ms delta
      act(() => {
        characteristicValueChangedCallback({
          target: { value: new DataView(new ArrayBuffer(2)) },
        })
      })
      // At this point, the history should be [1000, 1050, 1000, 1000, 1000]
      // Average is (1000 + 1050 + 1000 + 1000 + 1000) / 5 = 1010
      expect(result.current.signalPeriodMs).toBe(1010)

      // Sixth packet, the first one should be removed from history
      jest.spyOn(Date, 'now').mockReturnValue(now + 6100) // 1050ms delta
      act(() => {
        characteristicValueChangedCallback({
          target: { value: new DataView(new ArrayBuffer(2)) },
        })
      })

      // Now the history should be [1050, 1000, 1000, 1000, 1050]
      // Average is (1050 + 1000 + 1000 + 1000 + 1050) / 5 = 1020
      expect(result.current.signalPeriodMs).toBe(1020)
    })

    it('should proactively increase signal period on missed heartbeats', async () => {
      jest.useFakeTimers()
      const { result } = renderHook(() => useBluetoothHRM())
      let characteristicValueChangedCallback: (
        event: unknown
      ) => void = () => {}

      // Mock the characteristic and capture the event listener
      const mockCharacteristic = {
        startNotifications: jest.fn().mockResolvedValue(undefined),
        addEventListener: jest.fn((_event, callback) => {
          characteristicValueChangedCallback = callback
        }),
      }

      // @ts-expect-error Gatt is a mock
      mockGatt.connect.mockResolvedValue({
        getPrimaryService: jest.fn().mockResolvedValue({
          getCharacteristic: jest.fn().mockResolvedValue(mockCharacteristic),
        }),
      })

      await act(async () => {
        await result.current.connectAndStream()
      })

      // Simulate a packet arrival to establish a baseline
      const now = Date.now()
      jest.spyOn(Date, 'now').mockReturnValue(now)
      act(() => {
        characteristicValueChangedCallback({
          target: { value: new DataView(new ArrayBuffer(2)) },
        })
      })

      jest.spyOn(Date, 'now').mockReturnValue(now + 1000)
      act(() => {
        characteristicValueChangedCallback({
          target: { value: new DataView(new ArrayBuffer(2)) },
        })
      })
      expect(result.current.signalPeriodMs).toBe(1000)

      // Advance time by 2 seconds without sending a packet
      jest.spyOn(Date, 'now').mockReturnValue(now + 3000)
      act(() => {
        jest.advanceTimersByTime(2000)
      })

      // The heartbeat should have fired twice. The first time, it penalizes
      // with the time since last data (2000ms), the second time with 3000ms.
      // History: [1000, 2000, 3000] -> Avg: 2000
      expect(result.current.signalPeriodMs).toBe(2000)

      // A real packet arrives after the drop
      jest.spyOn(Date, 'now').mockReturnValue(now + 4000)
      act(() => {
        characteristicValueChangedCallback({
          target: { value: new DataView(new ArrayBuffer(2)) },
        })
      })

      // The real delta is 3000ms (from now+1000 to now+4000)
      // History: [1000, 2000, 3000, 3000] -> Avg: 2250
      expect(result.current.signalPeriodMs).toBe(2250)
    })
  })

  describe('Timers and Watchdogs', () => {
    beforeEach(() => {
      jest.useFakeTimers()
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('should trigger a reconnect if data goes stale', async () => {
      const { result } = renderHook(() =>
        useBluetoothHRM({ dataLivenessTimeoutMs: 5000 })
      )

      let characteristicValueChangedCallback: (
        event: unknown
      ) => void = () => {}

      // Capture the event listener
      mockCharacteristic.addEventListener.mockImplementation((_event, cb) => {
        characteristicValueChangedCallback = cb
      })

      // Connect the device
      await act(async () => {
        await result.current.connectAndStream()
      })
      expect(result.current.isConnected).toBe(true)

      // Simulate one data packet
      act(() => {
        characteristicValueChangedCallback({
          target: { value: new DataView(new ArrayBuffer(2)) },
        })
      })

      // Advance time just past the staleness threshold
      await act(async () => {
        jest.advanceTimersByTime(6000)
      })

      // Check that the status has changed to reconnecting
      expect(result.current.deviceStatus).toBe(
        'Connection unstable. Reconnecting...'
      )
      // Check that the gatt disconnect method was called
      expect(mockGatt.disconnect).toHaveBeenCalledTimes(1)
    })

    it('should not trigger reconnect if data is fresh', async () => {
      const { result } = renderHook(() =>
        useBluetoothHRM({ dataLivenessTimeoutMs: 5000 })
      )

      let characteristicValueChangedCallback: (
        event: unknown
      ) => void = () => {}
      mockCharacteristic.addEventListener.mockImplementation((_event, cb) => {
        characteristicValueChangedCallback = cb
      })

      // Connect the device
      await act(async () => {
        await result.current.connectAndStream()
      })
      expect(result.current.isConnected).toBe(true)

      // Simulate one data packet
      act(() => {
        characteristicValueChangedCallback({
          target: { value: new DataView(new ArrayBuffer(2)) },
        })
      })

      // Advance time, but not enough to be stale
      await act(async () => {
        jest.advanceTimersByTime(4000)
      })

      // Simulate another data packet
      act(() => {
        characteristicValueChangedCallback({
          target: { value: new DataView(new ArrayBuffer(2)) },
        })
      })

      // Advance time again, total time is > 5000, but last packet was recent
      await act(async () => {
        jest.advanceTimersByTime(3000)
      })

      // Status should still be connected
      expect(result.current.isConnected).toBe(true)
      expect(mockGatt.disconnect).not.toHaveBeenCalled()
    })

    it('should not have a data liveness watchdog if timeout is 0', async () => {
      const { result } = renderHook(() =>
        useBluetoothHRM({ dataLivenessTimeoutMs: 0 })
      )
      let characteristicValueChangedCallback: (
        event: unknown
      ) => void = () => {}
      mockCharacteristic.addEventListener.mockImplementation((_event, cb) => {
        characteristicValueChangedCallback = cb
      })
      await act(async () => {
        await result.current.connectAndStream()
      })
      act(() => {
        characteristicValueChangedCallback({
          target: { value: new DataView(new ArrayBuffer(2)) },
        })
      })

      // Advance time well past where a timeout would have occurred
      await act(async () => {
        jest.advanceTimersByTime(20000)
      })

      // Should still be connected
      expect(result.current.isConnected).toBe(true)
      expect(mockGatt.disconnect).not.toHaveBeenCalled()
    })
  })
})
