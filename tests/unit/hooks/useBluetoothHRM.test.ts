/**
 * @jest-environment jsdom
 */
import { renderHook, act, waitFor } from '@testing-library/react'
import useBluetoothHRM, { HEARTBEAT_INTERVAL_MS } from '@/hooks/useBluetoothHRM'
import * as WebSocketContext from '@/context/WebSocketContext'
import * as cookieUtils from '@/utils/cookies'
import { env } from '@/lib/env'

// Mock the WebSocket context
jest.mock('@/context/WebSocketContext')
jest.mock('@/utils/cookies')

// Mock logger
jest.mock('@/utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}))

import {
  MockBluetoothDevice,
  MockBluetoothRemoteGATTServer,
  MockBluetoothRemoteGATTService,
  MockBluetoothRemoteGATTCharacteristic,
} from '@/tests/test-utils/bluetooth-test-utils'

describe('useBluetoothHRM', () => {
  let mockGatt: MockBluetoothRemoteGATTServer
  let mockDevice: MockBluetoothDevice
  let mockBluetooth: {
    requestDevice: jest.Mock<Promise<MockDevice>>
    getDevices: jest.Mock<Promise<MockDevice[]>>
  }

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks()
    jest.useFakeTimers()
    jest.clearAllTimers()

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
    const mockCharacteristic: MockBluetoothRemoteGATTCharacteristic = {
      startNotifications: jest.fn().mockResolvedValue(undefined),
      stopNotifications: jest.fn().mockResolvedValue(undefined),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }

    const mockService: MockBluetoothRemoteGATTService = {
      getCharacteristic: jest.fn().mockResolvedValue(mockCharacteristic),
    }

    mockGatt = {
      connect: jest.fn(),
      disconnect: jest.fn(),
      getPrimaryService: jest.fn().mockResolvedValue(mockService),
    }
    mockGatt.connect.mockResolvedValue(mockGatt)

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

  afterEach(() => {
    jest.useRealTimers()
  })

  it('should not attempt to auto-connect if no device is saved', async () => {
    const { result } = renderHook(() => useBluetoothHRM())

    await act(async () => {
      await result.current.autoConnect()
    })

    expect(mockBluetooth.getDevices).not.toHaveBeenCalled()
    expect(mockGatt.connect).not.toHaveBeenCalled()
    expect(result.current.deviceStatus).toBe('Disconnected')
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

    expect(result.current.deviceStatus).toBe('Disconnected')
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
      } catch {
        // ignore
      }
    })

    expect(mockBluetooth.requestDevice).toHaveBeenCalled()
  })

  it('should ignore subsequent connection attempts while one is in progress', async () => {
    const mockAbort = jest.fn()
    const OriginalAbortController = global.AbortController
    global.AbortController = jest.fn().mockImplementation(() => ({
      signal: {
        aborted: false,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      },
      abort: mockAbort,
    })) as jest.Mock

    try {
      // Make the connect call a promise that we can control
      let connectResolver: (value: MockBluetoothRemoteGATTServer) => void
      const connectPromise = new Promise<MockBluetoothRemoteGATTServer>(
        (resolve) => {
          connectResolver = resolve
        }
      )
      mockGatt.connect.mockReturnValue(connectPromise)

      const { result } = renderHook(() => useBluetoothHRM())

      // 1. Start the first connection attempt
      let firstPromise: Promise<void> | undefined
      act(() => {
        // use catch to prevent unhandled promise rejection in test
        firstPromise = result.current.connectAndStream()
      })

      // 2. Wait for the hook to update state to "Connecting"
      await waitFor(() => {
        expect(result.current.deviceStatus).toMatch(/connecting/i)
      })

      // 3. Start the second connection attempt
      act(() => {
        result.current.connectAndStream()
      })

      // 4. Verify abort was NOT called, and connect was only called once
      expect(mockAbort).not.toHaveBeenCalled()
      expect(mockGatt.connect).toHaveBeenCalledTimes(1)

      // 5. Cleanup: Resolve the pending promise to let the test finish gracefully
      await act(async () => {
        connectResolver(mockGatt)
        await firstPromise
      })

      // 6. Check final status
      expect(result.current.isConnected).toBe(true)
    } finally {
      // Restore original AbortController
      global.AbortController = OriginalAbortController
    }
  })

  describe('Signal Quality Calculation', () => {
    it('should calculate the rolling average of signal period', async () => {
      const { result } = renderHook(() => useBluetoothHRM())
      let characteristicValueChangedCallback: (event: {
        target: { value: DataView }
      }) => void = () => {}

      // Mock the characteristic and capture the event listener
      const mockCharacteristic: MockBluetoothRemoteGATTCharacteristic = {
        startNotifications: jest.fn().mockResolvedValue(undefined),
        stopNotifications: jest.fn().mockResolvedValue(undefined),
        addEventListener: jest.fn((_event, callback) => {
          characteristicValueChangedCallback = callback
        }),
        removeEventListener: jest.fn(),
      }

      const mockService: MockBluetoothRemoteGATTService = {
        getCharacteristic: jest.fn().mockResolvedValue(mockCharacteristic),
      }

      mockGatt.connect.mockResolvedValue({
        ...mockGatt,
        getPrimaryService: jest.fn().mockResolvedValue(mockService),
      })

      await act(async () => {
        await result.current.connectAndStream()
      })

      // Simulate packet arrivals
      const now = Date.now()

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
      const { result } = renderHook(() => useBluetoothHRM())
      let characteristicValueChangedCallback: (event: {
        target: { value: DataView }
      }) => void = () => {}

      // Mock the characteristic and capture the event listener
      const mockCharacteristic: MockBluetoothRemoteGATTCharacteristic = {
        startNotifications: jest.fn().mockResolvedValue(undefined),
        stopNotifications: jest.fn().mockResolvedValue(undefined),
        addEventListener: jest.fn((_event, callback) => {
          characteristicValueChangedCallback = callback
        }),
        removeEventListener: jest.fn(),
      }

      const mockService: MockBluetoothRemoteGATTService = {
        getCharacteristic: jest.fn().mockResolvedValue(mockCharacteristic),
      }

      mockGatt.connect.mockResolvedValue({
        ...mockGatt,
        getPrimaryService: jest.fn().mockResolvedValue(mockService),
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

      // Simulate first missed heartbeat check
      jest.spyOn(Date, 'now').mockReturnValue(now + 3000)
      await act(async () => {
        // Advance timers enough for the watchdog to run once
        jest.advanceTimersByTime(HEARTBEAT_INTERVAL_MS)
      })

      // Simulate second missed heartbeat check
      jest.spyOn(Date, 'now').mockReturnValue(now + 4000)
      await act(async () => {
        // Advance timers enough for the watchdog to run again
        jest.advanceTimersByTime(HEARTBEAT_INTERVAL_MS)
      })

      // The heartbeat should have fired twice. The first time, it penalizes
      // with the time since last data (2000ms from now+1000 to now+3000),
      // the second time with 3000ms (from now+1000 to now+4000).
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

      jest.useRealTimers()
    })
  })

  describe('Watchdog and Reconnection', () => {
    const WATCHDOG_INTERVAL_MS = HEARTBEAT_INTERVAL_MS * 2 // Watchdog runs every 2nd heartbeat
    let onDisconnectedCallback: () => void = () => {}
    let setTimeoutSpy: jest.SpyInstance

    beforeEach(() => {
      // Capture the 'gattserverdisconnected' event listener
      onDisconnectedCallback = () => {} // Reset before each test
      mockDevice.addEventListener.mockImplementation(
        (event: string, callback: () => void) => {
          if (event === 'gattserverdisconnected') {
            onDisconnectedCallback = callback
          }
        }
      )
    })

    afterEach(() => {
      if (setTimeoutSpy) {
        setTimeoutSpy.mockClear()
      }
    })

    it('should detect data staleness and attempt to reconnect', async () => {
      const dataLivenessTimeoutMs = 5000
      const { result } = renderHook(() =>
        useBluetoothHRM({ dataLivenessTimeoutMs })
      )
      let characteristicValueChangedCallback: (event: {
        target: { value: DataView }
      }) => void = () => {}

      const mockCharacteristic: MockBluetoothRemoteGATTCharacteristic = {
        startNotifications: jest.fn().mockResolvedValue(undefined),
        stopNotifications: jest.fn().mockResolvedValue(undefined),
        addEventListener: jest.fn((_event, callback) => {
          characteristicValueChangedCallback = callback
        }),
        removeEventListener: jest.fn(),
      }

      const mockService: MockBluetoothRemoteGATTService = {
        getCharacteristic: jest.fn().mockResolvedValue(mockCharacteristic),
      }

      mockGatt.connect.mockResolvedValue({
        ...mockGatt,
        getPrimaryService: jest.fn().mockResolvedValue(mockService),
      })

      await act(async () => {
        await result.current.connectAndStream()
      })

      // Simulate one packet to set the initial lastDataTime
      act(() => {
        characteristicValueChangedCallback({
          target: { value: new DataView(new ArrayBuffer(2)) },
        })
      })

      expect(result.current.isConnected).toBe(true)
      expect(result.current.isDataStale).toBe(false)

      // Advance time just past the staleness timeout
      await act(async () => {
        jest.advanceTimersByTime(dataLivenessTimeoutMs + 100)
      })

      // The watchdog runs on a timer, so we need to advance time for it to trigger
      await act(async () => {
        jest.advanceTimersByTime(WATCHDOG_INTERVAL_MS)
      })

      expect(result.current.isDataStale).toBe(true)
      expect(result.current.deviceStatus).toMatch(/reconnecting/i)
      expect(mockGatt.disconnect).toHaveBeenCalled()
    })

    it(`should attempt to reconnect on disconnection and give up after ${env.BLUETOOTH_MAX_RECONNECTION_ATTEMPTS} attempts`, async () => {
      const { result } = renderHook(() => useBluetoothHRM())

      // First connection is successful
      await act(async () => {
        await result.current.connectAndStream()
      })

      expect(result.current.isConnected).toBe(true)
      mockGatt.connect.mockClear() // Clear the initial connect call

      // Subsequent connection attempts will fail
      mockGatt.connect.mockRejectedValue(new Error('Reconnect failed'))

      // --- Simulate disconnection ---
      await act(async () => {
        onDisconnectedCallback()
      })

      expect(result.current.isConnected).toBe(false)
      expect(result.current.deviceStatus).toMatch(
        new RegExp(
          `reconnecting.*attempt 1/${env.BLUETOOTH_MAX_RECONNECTION_ATTEMPTS}`,
          'i'
        )
      )

      // --- Reconnection attempts ---
      for (let i = 1; i <= env.BLUETOOTH_MAX_RECONNECTION_ATTEMPTS; i++) {
        const delay = Math.pow(2, i) * 1000
        await act(async () => {
          jest.advanceTimersByTime(delay)
        })
        expect(mockGatt.connect).toHaveBeenCalledTimes(i)
        if (i < env.BLUETOOTH_MAX_RECONNECTION_ATTEMPTS) {
          expect(result.current.deviceStatus).toMatch(
            new RegExp(
              `reconnecting.*attempt ${
                i + 1
              }/${env.BLUETOOTH_MAX_RECONNECTION_ATTEMPTS}`,
              'i'
            )
          )
        }
      }

      // After max attempts, it should fail
      await act(async () => {
        jest.advanceTimersByTime(100)
      })

      await waitFor(() => {
        expect(result.current.deviceStatus).toMatch(
          new RegExp(
            `failed to reconnect after ${env.BLUETOOTH_MAX_RECONNECTION_ATTEMPTS} attempts`,
            'i'
          )
        )
      })
      expect(mockGatt.connect).toHaveBeenCalledTimes(
        env.BLUETOOTH_MAX_RECONNECTION_ATTEMPTS
      ) // No more calls

      // It should also forget the device
      await act(async () => {
        jest.advanceTimersByTime(2000) // Run the final timer to forget the device
      })
      expect(cookieUtils.setCookie).toHaveBeenCalledWith(
        'hrm_device_id',
        '',
        -1
      )
    })

    it('should successfully reconnect after a disconnection', async () => {
      const { result } = renderHook(() => useBluetoothHRM())

      await act(async () => {
        await result.current.connectAndStream()
      })
      mockGatt.connect.mockClear()

      // First reconnect attempt fails, second succeeds
      mockGatt.connect
        .mockRejectedValueOnce(new Error('Reconnect failed'))
        .mockResolvedValue(mockGatt)

      await act(async () => {
        onDisconnectedCallback()
      })

      // First attempt
      await act(async () => {
        jest.runOnlyPendingTimers()
      })
      expect(mockGatt.connect).toHaveBeenCalledTimes(1)
      expect(result.current.isConnected).toBe(false)
      expect(result.current.deviceStatus).toMatch(
        new RegExp(
          `reconnecting.*attempt 2/${env.BLUETOOTH_MAX_RECONNECTION_ATTEMPTS}`,
          'i'
        )
      )

      // Second attempt (should succeed)
      await act(async () => {
        jest.runOnlyPendingTimers()
      })
      expect(mockGatt.connect).toHaveBeenCalledTimes(2)
      expect(result.current.isConnected).toBe(true)
      expect(result.current.deviceStatus).toBe('Connected to: Test HRM')
    })

    it('should not attempt to reconnect after a manual disconnect', async () => {
      const { result } = renderHook(() => useBluetoothHRM())

      await act(async () => {
        await result.current.connectAndStream()
      })
      mockGatt.connect.mockClear()

      // Clear any timers from the connection phase before spying
      jest.clearAllTimers()
      const setTimeoutSpy = jest.spyOn(global, 'setTimeout')

      // Manually disconnect
      act(() => {
        result.current.disconnect()
      })
      expect(result.current.deviceStatus).toBe('Disconnected')

      // Simulate the gattserverdisconnected event that follows a manual disconnect
      act(() => {
        onDisconnectedCallback()
      })

      // Ensure no timers are pending for reconnection
      expect(setTimeoutSpy).not.toHaveBeenCalled()
      expect(mockGatt.connect).not.toHaveBeenCalled()
      expect(result.current.deviceStatus).toBe('Disconnected')

      setTimeoutSpy.mockRestore()
      jest.useRealTimers()
    })

    it('should attempt to reconnect after an unexpected disconnection and succeed', async () => {
      const { result } = renderHook(() => useBluetoothHRM())

      // First connection is successful
      await act(async () => {
        await result.current.connectAndStream()
      })
      expect(result.current.isConnected).toBe(true)

      // Mock the next connection attempt to be successful
      mockGatt.connect.mockResolvedValue(mockGatt)

      // Manually trigger the disconnection event
      await act(async () => {
        onDisconnectedCallback()
      })

      // Verify that the hook is now in a reconnecting state
      expect(result.current.isConnected).toBe(false)
      expect(result.current.deviceStatus).toContain('Reconnecting')

      // Advance timers to trigger the reconnect attempt
      await act(async () => {
        jest.runOnlyPendingTimers()
      })

      // Verify that the connection was successful
      await waitFor(() => {
        expect(result.current.isConnected).toBe(true)
        expect(result.current.deviceStatus).toBe('Connected to: Test HRM')
      })
    })
  })

  describe('Configurable Reconnection Attempts', () => {
    const originalEnv = process.env

    beforeEach(() => {
      jest.resetModules() // Important to re-evaluate env variables
      process.env = { ...originalEnv }
    })

    afterAll(() => {
      process.env = originalEnv
    })

    it('should use the default max reconnection attempts when the environment variable is not set', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { env } = require('@/lib/env')
      expect(env.BLUETOOTH_MAX_RECONNECTION_ATTEMPTS).toBe(5)
    })

    it('should use the custom max reconnection attempts from the environment variable', async () => {
      process.env.BLUETOOTH_MAX_RECONNECTION_ATTEMPTS = '10'
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { env } = require('@/lib/env')
      expect(env.BLUETOOTH_MAX_RECONNECTION_ATTEMPTS).toBe(10)
    })
  })
})
