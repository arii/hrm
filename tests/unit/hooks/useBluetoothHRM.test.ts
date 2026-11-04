/**
 * @jest-environment jsdom
 */
import { renderHook, act, waitFor } from '@testing-library/react'
import useBluetoothHRM, {
  HEARTBEAT_INTERVAL_MS,
  classifyGattConnectError,
  classifyGattFailure,
  getAutoConnectFailureMessage,
  isBusyRadioError,
  isQuietStrapMiss,
  resolveConnectDevice,
  teardownTestControls,
  type GattConnectRetryState,
  type HrmTestControls,
} from '@/hooks/useBluetoothHRM'
import {
  BUSY_RETRY_DELAYS_MS,
  QUIET_STRAP_RETRY_DELAYS_MS,
  WAKE_ATTEMPT_COOLDOWN_MS,
  WAIT_GUIDANCE_AFTER_MISSES,
} from '@/constants/bluetooth-reconnection'
import logger from '@/utils/logger'
import { BLUETOOTH_MESSAGES } from '@/constants/bluetooth-messages'
import * as WebSocketContext from '@/context/WebSocketContext'
import Cookies from 'js-cookie'
import { env } from '@/lib/env'

// Mock the WebSocket context
jest.mock('@/context/WebSocketContext')
jest.mock('js-cookie', () => ({
  get: jest.fn(),
  set: jest.fn(),
  remove: jest.fn(),
}))

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

    // Mock WebSocket connection slice (the hook reads nothing else)
    jest.spyOn(WebSocketContext, 'useWebSocketConnection').mockReturnValue({
      sendData: jest.fn(),
      connectionStatus: 'Connected',
      connect: jest.fn(),
      disconnect: jest.fn(),
    })

    // Mock cookie functions
    ;(Cookies.get as jest.Mock).mockReturnValue('')
    ;(Cookies.set as jest.Mock).mockImplementation(() => {})

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
    ;(Cookies.get as jest.Mock).mockReturnValue('test-device-id')
    mockBluetooth.getDevices.mockResolvedValue([mockDevice])
    const { result } = renderHook(() => useBluetoothHRM())

    await act(async () => {
      await result.current.autoConnect()
    })

    // autoConnect is async and may not call getDevices synchronously
    await waitFor(() => {
      expect(mockBluetooth.getDevices).toHaveBeenCalled()
    })
    expect(mockGatt.connect).toHaveBeenCalled()
    expect(result.current.deviceStatus).toBe('Connected to: Test HRM')
  })

  it('enters waiting state on silent connection failure with a known device', async () => {
    ;(Cookies.get as jest.Mock).mockReturnValue('test-device-id')
    mockBluetooth.getDevices.mockResolvedValue([mockDevice])
    mockGatt.connect.mockRejectedValue(new Error('Connection failed'))
    const { result } = renderHook(() => useBluetoothHRM())

    await act(async () => {
      await result.current.autoConnect()
    })

    // autoConnect is async and may not call getDevices synchronously.
    // A known device waits for the strap instead of failing dead (9806).
    await waitFor(() => {
      expect(result.current.deviceStatus).toBe(
        BLUETOOTH_MESSAGES.waitingForDevice('Test HRM')
      )
    })
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

  it('ignores connection attempts while isConnecting lock is held', async () => {
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

      let firstPromise: Promise<void> | undefined
      act(() => {
        firstPromise = result.current.connectAndStream()
      })

      await waitFor(() => {
        expect(result.current.deviceStatus).toMatch(/connecting/i)
      })

      act(() => {
        result.current.connectAndStream()
      })

      expect(mockAbort).not.toHaveBeenCalled()
      expect(mockGatt.connect).toHaveBeenCalledTimes(1)

      await act(async () => {
        connectResolver(mockGatt)
        await firstPromise
      })

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

      expect(result.current.signalPeriodMs).toBe(1020)
      expect(result.current.lastPeriodMs).toBe(1050)
      expect(result.current.consecutiveSlowPackets).toBe(0)
    })

    it('should track consecutive slow packets', async () => {
      const { result } = renderHook(() => useBluetoothHRM())
      let characteristicCallback: (event: {
        target: { value: DataView }
      }) => void = () => {}
      mockGatt.connect.mockResolvedValue({
        ...mockGatt,
        getPrimaryService: () =>
          Promise.resolve({
            getCharacteristic: () =>
              Promise.resolve({
                startNotifications: jest.fn(),
                addEventListener: (
                  _e: string,
                  cb: (event: { target: { value: DataView } }) => void
                ) => {
                  characteristicCallback = cb
                },
                removeEventListener: jest.fn(),
              }),
          }),
      } as unknown as MockBluetoothRemoteGATTServer)
      await act(() => result.current.connectAndStream())
      const sendPacket = (gap: number) => {
        jest.spyOn(Date, 'now').mockReturnValue(Date.now() + gap)
        act(() =>
          characteristicCallback({
            target: { value: new DataView(new ArrayBuffer(2)) },
          })
        )
      }
      sendPacket(1000) // First packet
      sendPacket(1600) // Slow
      expect(result.current.consecutiveSlowPackets).toBe(1)
      sendPacket(1700) // Slow
      expect(result.current.consecutiveSlowPackets).toBe(2)
      sendPacket(1000) // Normal
      expect(result.current.consecutiveSlowPackets).toBe(0)
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
      expect(result.current.lastPeriodMs).toBe(3000)
      // Watchdog increments consecutiveSlowPackets
      // 1st watchdog: now+3000 (timeSinceLastData=2000) -> +1
      // 2nd watchdog: now+4000 (timeSinceLastData=3000) -> +1
      expect(result.current.consecutiveSlowPackets).toBe(2)

      // A real packet arrives after the drop
      jest.spyOn(Date, 'now').mockReturnValue(now + 4000)
      act(() => {
        characteristicValueChangedCallback({
          target: { value: new DataView(new ArrayBuffer(2)) },
        })
      })

      // The real delta is 3000ms (from now+1000 to now+4000)
      // History: [1000, 2000, 3000, 3000] -> Avg: 2250 (or 2333 with new math)
      expect(result.current.signalPeriodMs).toBe(2333)

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
        useBluetoothHRM({
          dataLivenessTimeoutMs,
        })
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

      // Advance time just past the staleness timeout
      await act(async () => {
        jest.advanceTimersByTime(dataLivenessTimeoutMs + 100)
      })

      // The watchdog runs on a timer, so we need to advance time for it to trigger
      await act(async () => {
        jest.advanceTimersByTime(WATCHDOG_INTERVAL_MS)
      })

      expect(result.current.deviceStatus).toMatch(/reconnecting/i)
      expect(mockGatt.disconnect).toHaveBeenCalled()
    })

    it('should sever the GATT link when a connection attempt fails (#9154 zombie killer)', async () => {
      jest.useRealTimers() // fast-retry path sleeps on real timers
      // Persistent failure: every fast-retry attempt fails so the outer catch runs.
      mockGatt.connect.mockRejectedValue(
        new DOMException(
          'GATT Server is disconnected. Connect first.',
          'NetworkError'
        )
      )

      const { result } = renderHook(() => useBluetoothHRM())
      await act(async () => {
        await result.current.connectAndStream().catch(() => {})
      })
      // Failure path must best-effort disconnect so retries meet a free radio.
      expect(mockGatt.disconnect).toHaveBeenCalled()
    })

    it(`reconnects ${env.NEXT_PUBLIC_BLUETOOTH_MAX_RECONNECT_ATTEMPTS} times then waits keeping the device (issue 9806)`, async () => {
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
          `reconnecting.*attempt 1/${env.NEXT_PUBLIC_BLUETOOTH_MAX_RECONNECT_ATTEMPTS}`,
          'i'
        )
      )

      // --- Reconnection attempts ---
      for (
        let i = 1;
        i <= env.NEXT_PUBLIC_BLUETOOTH_MAX_RECONNECT_ATTEMPTS;
        i++
      ) {
        await act(async () => {
          jest.runOnlyPendingTimers()
        })
        expect(mockGatt.connect).toHaveBeenCalledTimes(i)
        if (i < env.NEXT_PUBLIC_BLUETOOTH_MAX_RECONNECT_ATTEMPTS) {
          expect(result.current.deviceStatus).toMatch(
            new RegExp(
              `reconnecting.*attempt ${
                i + 1
              }/${env.NEXT_PUBLIC_BLUETOOTH_MAX_RECONNECT_ATTEMPTS}`,
              'i'
            )
          )
        }
      }

      // After max attempts it waits (slow poll is 60s out: no more
      // rapid calls) and keeps the saved device for the recovery.
      await act(async () => {
        jest.advanceTimersByTime(100)
      })

      await waitFor(() => {
        expect(result.current.deviceStatus).toBe(
          BLUETOOTH_MESSAGES.waitingForDevice('Test HRM')
        )
      })
      expect(mockGatt.connect).toHaveBeenCalledTimes(
        env.NEXT_PUBLIC_BLUETOOTH_MAX_RECONNECT_ATTEMPTS
      ) // No more rapid calls

      await act(async () => {
        jest.advanceTimersByTime(2000)
      })
      expect(Cookies.remove).not.toHaveBeenCalledWith('hrm_device_id')
      expect(mockGatt.connect).toHaveBeenCalledTimes(
        env.NEXT_PUBLIC_BLUETOOTH_MAX_RECONNECT_ATTEMPTS
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
          `reconnecting.*attempt 2/${env.NEXT_PUBLIC_BLUETOOTH_MAX_RECONNECT_ATTEMPTS}`,
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

    it('waits (keeping the device) when a reconnect times out', async () => {
      const { result } = renderHook(() => useBluetoothHRM())

      await act(async () => {
        await result.current.connectAndStream()
      })
      expect(result.current.isConnected).toBe(true)
      mockGatt.connect.mockClear()

      // The strap goes quiet: radio attempts hang until the 20s timer.
      mockGatt.connect.mockImplementation(() => new Promise(() => {}))
      mockGatt.connected = false

      await act(async () => {
        onDisconnectedCallback()
      })
      // Flush the backoff delay, the 20s radio timer, and the first 60s
      // safety poll: patience, not a retry storm — and never a wipe.
      await act(async () => {
        await jest.advanceTimersByTimeAsync(120000)
      })

      // Initial attempt + one slow poll: the radio gets time to settle,
      // and recovery stays automatic (no manual retry needed).
      expect(mockGatt.connect).toHaveBeenCalledTimes(2)
      expect(result.current.deviceStatus).toContain('Waiting')
      expect(Cookies.remove).not.toHaveBeenCalledWith('hrm_device_id')

      // A later genuine disconnect starts a fresh episode.
      // Real disconnect events carry the device as their target.
      mockGatt.connect.mockReset()
      mockGatt.connect.mockResolvedValue(mockGatt)
      await act(async () => {
        ;(onDisconnectedCallback as (event: unknown) => void)({
          target: mockDevice,
        })
      })
      await act(async () => {
        await jest.advanceTimersByTimeAsync(10000)
      })
      expect(result.current.isConnected).toBe(true)
    })

    describe('waiting for device (issue 9806)', () => {
      const armWaitingViaSilentFailure = async (
        autoConnect: () => Promise<void>
      ) => {
        ;(Cookies.get as jest.Mock).mockReturnValue('test-device-id')
        mockBluetooth.getDevices.mockResolvedValue([mockDevice])
        mockGatt.connect.mockRejectedValue(
          new DOMException(
            'Bluetooth Device is no longer in range.',
            'NetworkError'
          )
        )
        await act(async () => {
          const pending = autoConnect().catch(() => {})
          // Quiet retries span ~35s; stay under the 60s safety poll.
          await jest.advanceTimersByTimeAsync(45000)
          await pending
        })
      }

      const addWatchMocks = () => {
        const watch = jest.fn().mockResolvedValue(undefined)
        const unwatch = jest.fn()
        Object.assign(mockDevice, {
          watchAdvertisements: watch,
          unwatchAdvertisements: unwatch,
        })
        return { watch, unwatch }
      }

      const adListener = (): (() => void) => {
        const call = mockDevice.addEventListener.mock.calls.find(
          ([eventName]: [string, unknown]) =>
            eventName === 'advertisementreceived'
        )
        if (!call) throw new Error('no advertisement listener registered')
        return call[1] as () => void
      }

      it('waits (instead of stopping) when silent auto-connect exhausts with a known device', async () => {
        const { watch } = addWatchMocks()
        const { result } = renderHook(() => useBluetoothHRM())

        await armWaitingViaSilentFailure(result.current.autoConnect)

        expect(result.current.deviceStatus).toContain('Waiting')
        expect(watch).toHaveBeenCalledTimes(1)
      })

      it('connects when an advertisement arrives while waiting', async () => {
        const { unwatch } = addWatchMocks()
        const { result } = renderHook(() => useBluetoothHRM())

        await armWaitingViaSilentFailure(result.current.autoConnect)
        mockGatt.connect.mockResolvedValue(mockGatt)

        await act(async () => {
          adListener()()
        })

        expect(result.current.isConnected).toBe(true)
        expect(unwatch).toHaveBeenCalled()
      })

      it('keeps the saved device and waits instead of forgetting after reconnect exhaustion', async () => {
        const { watch } = addWatchMocks()
        const { result } = renderHook(() => useBluetoothHRM())

        await act(async () => {
          await result.current.connectAndStream()
        })
        expect(result.current.isConnected).toBe(true)

        // Mid-session drop; the strap stays quiet through all 8 attempts.
        mockGatt.connect.mockRejectedValue(
          new DOMException(
            'Bluetooth Device is no longer in range.',
            'NetworkError'
          )
        )
        const onDisconnect = mockDevice.addEventListener.mock.calls.find(
          ([eventName]: [string, unknown]) =>
            eventName === 'gattserverdisconnected'
        )?.[1] as (event: unknown) => void
        // Separate acts: the status-mirror effect must flush before the
        // reconnect timers run, or the guard reads stale CONNECTED and
        // skips every cycle.
        await act(async () => {
          onDisconnect({ target: mockDevice })
        })
        await act(async () => {
          // 8 backoff cycles span ~38s max; stay under the 60s safety poll.
          await jest.advanceTimersByTimeAsync(50000)
        })

        expect(Cookies.remove).not.toHaveBeenCalledWith('hrm_device_id')
        expect(result.current.deviceStatus).toContain('Waiting')
        expect(watch).toHaveBeenCalled()
      })

      it('slow-polls while waiting when advertisements are unavailable', async () => {
        // No watch mocks: the device predates watchAdvertisements.
        const { result } = renderHook(() => useBluetoothHRM())

        await armWaitingViaSilentFailure(result.current.autoConnect)
        expect(result.current.deviceStatus).toContain('Waiting')
        const attemptsAfterWait = mockGatt.connect.mock.calls.length

        await act(async () => {
          await jest.advanceTimersByTimeAsync(65000)
        })

        expect(mockGatt.connect.mock.calls.length).toBeGreaterThan(
          attemptsAfterWait
        )
      })

      it('falls back to slow-polling when the advertisement watch rejects', async () => {
        const rejection = new DOMException(
          'Watch not supported',
          'NotSupportedError'
        )
        Object.assign(mockDevice, {
          watchAdvertisements: jest.fn().mockRejectedValue(rejection),
          unwatchAdvertisements: jest.fn(),
        })
        const { result } = renderHook(() => useBluetoothHRM())

        await armWaitingViaSilentFailure(result.current.autoConnect)

        expect(result.current.deviceStatus).toContain('Waiting')
        // The rejection reason must reach the log, not be swallowed.
        expect(logger.debug as jest.Mock).toHaveBeenCalledWith(
          expect.objectContaining({ error: rejection }),
          expect.stringContaining('polling only')
        )
        const attemptsAfterWait = mockGatt.connect.mock.calls.length

        await act(async () => {
          await jest.advanceTimersByTimeAsync(65000)
        })

        expect(mockGatt.connect.mock.calls.length).toBeGreaterThan(
          attemptsAfterWait
        )
      })

      it('cools down advertisement-triggered attempts instead of firing per packet', async () => {
        addWatchMocks()
        const { result } = renderHook(() => useBluetoothHRM())

        await armWaitingViaSilentFailure(result.current.autoConnect)
        const attemptsAfterWait = mockGatt.connect.mock.calls.length

        // A burst of advertisements inside the cooldown: one radio op.
        await act(async () => {
          const fire = adListener()
          fire()
          fire()
          fire()
        })

        expect(mockGatt.connect.mock.calls.length).toBe(attemptsAfterWait + 1)

        // Past the cooldown, the next advertisement tries again.
        await act(async () => {
          await jest.advanceTimersByTimeAsync(WAKE_ATTEMPT_COOLDOWN_MS + 1000)
          adListener()()
        })

        expect(mockGatt.connect.mock.calls.length).toBe(attemptsAfterWait + 2)
      })

      it('escalates to re-select guidance after sustained silent misses', async () => {
        // No watch mocks: pure poll mode, no advertisements ever seen.
        const { result } = renderHook(() => useBluetoothHRM())

        await armWaitingViaSilentFailure(result.current.autoConnect)
        expect(result.current.deviceStatus).toContain('Waiting')
        expect(result.current.deviceStatus).not.toContain('re-select')

        // Three failed 60s polls: patience becomes guidance.
        await act(async () => {
          await jest.advanceTimersByTimeAsync(65000 * 3)
        })

        expect(result.current.deviceStatus).toBe(
          BLUETOOTH_MESSAGES.stillWaitingForDevice('Test HRM')
        )
        // Recovery still runs underneath: polls continue.
        const callsAfterGuidance = mockGatt.connect.mock.calls.length
        await act(async () => {
          await jest.advanceTimersByTimeAsync(65000)
        })
        expect(mockGatt.connect.mock.calls.length).toBeGreaterThan(
          callsAfterGuidance
        )
      })

      it('names a refusing strap as possibly held by another app', async () => {
        addWatchMocks()
        const { result } = renderHook(() => useBluetoothHRM())

        await armWaitingViaSilentFailure(result.current.autoConnect)

        // Advertisements arrive but every connect is refused: misses with
        // ads seen (spaced past the cooldown).
        await act(async () => {
          for (let i = 0; i < WAIT_GUIDANCE_AFTER_MISSES; i++) {
            adListener()()
            await jest.advanceTimersByTimeAsync(WAKE_ATTEMPT_COOLDOWN_MS + 1000)
          }
        })

        expect(result.current.deviceStatus).toBe(
          BLUETOOTH_MESSAGES.deviceHeldElsewhere('Test HRM')
        )
      })

      it('does not auto-connect after a manual disconnect', async () => {
        const { result } = renderHook(() => useBluetoothHRM())

        await act(async () => {
          await result.current.connectAndStream()
        })
        expect(result.current.isConnected).toBe(true)

        await act(async () => {
          result.current.disconnect()
        })
        mockGatt.connect.mockClear()

        // The page effect refires autoConnect (connectionAttempted was
        // reset): it must no-op instead of undoing the manual stop.
        await act(async () => {
          await result.current.autoConnect()
        })

        expect(mockGatt.connect).not.toHaveBeenCalled()
        expect(result.current.isConnected).toBe(false)
      })

      it('stops waiting on manual disconnect', async () => {
        const { unwatch } = addWatchMocks()
        const { result } = renderHook(() => useBluetoothHRM())

        await armWaitingViaSilentFailure(result.current.autoConnect)
        const attemptsAfterWait = mockGatt.connect.mock.calls.length

        await act(async () => {
          result.current.disconnect()
          await jest.advanceTimersByTimeAsync(180000)
        })

        expect(unwatch).toHaveBeenCalled()
        expect(mockGatt.connect.mock.calls.length).toBe(attemptsAfterWait)
      })
    })

    it('does not stack heart-rate listeners across reconnects', async () => {
      const hrChar = {
        startNotifications: jest.fn().mockResolvedValue(undefined),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      }
      mockGatt.getPrimaryService.mockResolvedValue({
        getCharacteristic: jest.fn().mockResolvedValue(hrChar),
      })
      const { result } = renderHook(() => useBluetoothHRM())

      await act(async () => {
        await result.current.connectAndStream()
      })
      expect(result.current.isConnected).toBe(true)
      expect(hrChar.addEventListener).toHaveBeenCalledTimes(1)

      // Drop and reconnect: the same characteristic object is subscribed
      // again, so the previous subscription must be removed first.
      await act(async () => {
        onDisconnectedCallback()
      })
      await act(async () => {
        jest.runOnlyPendingTimers()
      })
      await waitFor(() => {
        expect(result.current.isConnected).toBe(true)
      })

      expect(hrChar.addEventListener).toHaveBeenCalledTimes(2)
      expect(hrChar.removeEventListener).toHaveBeenCalledTimes(1)
      expect(hrChar.removeEventListener).toHaveBeenCalledWith(
        'characteristicvaluechanged',
        expect.any(Function)
      )
      expect(
        hrChar.removeEventListener.mock.invocationCallOrder[0]
      ).toBeLessThan(hrChar.addEventListener.mock.invocationCallOrder[1])
    })

    it('removes the heart-rate listener on unmount', async () => {
      const hrChar = {
        startNotifications: jest.fn().mockResolvedValue(undefined),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      }
      mockGatt.getPrimaryService.mockResolvedValue({
        getCharacteristic: jest.fn().mockResolvedValue(hrChar),
      })
      const { result, unmount } = renderHook(() => useBluetoothHRM())

      await act(async () => {
        await result.current.connectAndStream()
      })
      expect(hrChar.addEventListener).toHaveBeenCalledTimes(1)

      act(() => {
        unmount()
      })

      expect(hrChar.removeEventListener).toHaveBeenCalledTimes(1)
      expect(hrChar.removeEventListener).toHaveBeenCalledWith(
        'characteristicvaluechanged',
        expect.any(Function)
      )
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
      expect(env.NEXT_PUBLIC_BLUETOOTH_MAX_RECONNECT_ATTEMPTS).toBe(8)
    })

    it('should use the custom max reconnection attempts from the environment variable', async () => {
      process.env.NEXT_PUBLIC_BLUETOOTH_MAX_RECONNECT_ATTEMPTS = '10'
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { env } = require('@/lib/env')
      expect(env.NEXT_PUBLIC_BLUETOOTH_MAX_RECONNECT_ATTEMPTS).toBe(10)
    })
  })

  describe('getAutoConnectFailureMessage', () => {
    it.each([
      [new Error('No saved device ID for silent connection.'), null],
      [new DOMException('Aborted', 'AbortError'), null],
      [
        new DOMException(
          'Bluetooth Device is no longer in range.',
          'NetworkError'
        ),
        BLUETOOTH_MESSAGES.connectionFailed,
      ],
      [
        new Error('Bluetooth Device is no longer in range.'),
        BLUETOOTH_MESSAGES.connectionFailed,
      ],
      [
        new Error('GATT connection timeout'),
        BLUETOOTH_MESSAGES.connectionTimeout,
      ],
      [new Error('Connection failed'), BLUETOOTH_MESSAGES.autoConnectFailed],
    ])('maps %p to %p', (error, expected) => {
      expect(getAutoConnectFailureMessage(error)).toBe(expected)
    })
  })

  describe('retry-loop error classifiers', () => {
    it.each([
      ['NetworkError: GATT operation failed', true],
      ['Failed: GATT busy', true],
      ['Bluetooth Device is no longer in range.', false],
      ['busy radio, device no longer in range', false],
      ['GATT connection timeout', false],
      ['Connection aborted', false],
    ])('isBusyRadioError(%p) is %p', (text, expected) => {
      expect(isBusyRadioError(text)).toBe(expected)
    })

    it.each([
      ['Bluetooth Device is no longer in range.', true],
      ['NetworkError: Device not found', true],
      ['DEVICE NOT FOUND', true],
      ['GATT connection timeout', false],
      ['Failed: GATT busy', false],
      ['Connection aborted', false],
    ])('isQuietStrapMiss(%p) is %p', (text, expected) => {
      expect(isQuietStrapMiss(text)).toBe(expected)
    })
  })

  describe('classifyGattFailure', () => {
    it.each([
      [
        'timeout wins over everything',
        new Error('GATT connection timeout'),
        false,
        'timeout',
      ],
      [
        'timeout wins even when aborted',
        new Error('GATT connection timeout'),
        true,
        'timeout',
      ],
      [
        'server-disconnected during connect',
        new Error('GATT Server is disconnected'),
        false,
        'disconnected-during-connect',
      ],
      [
        'operation-failed during connect',
        new Error('GATT operation failed'),
        false,
        'disconnected-during-connect',
      ],
      [
        'intentional abort',
        new DOMException('Connection cancelled', 'AbortError'),
        true,
        'intentional-abort',
      ],
      [
        'abort name without an aborted signal is a plain failure',
        new DOMException('Connection cancelled', 'AbortError'),
        false,
        'failed',
      ],
      ['plain error', new Error('boom'), false, 'failed'],
      ['non-error rejection', 'string failure', false, 'failed'],
    ])('%s', (_name, error, aborted, expected) => {
      expect(classifyGattFailure(error, aborted)).toBe(expected)
    })
  })

  describe('classifyGattConnectError', () => {
    const baseState = (): GattConnectRetryState => ({
      linkUp: false,
      aborted: false,
      attempt: 1,
      busyRetriesUsed: 0,
      quietRetriesUsed: 0,
      retryQuietStrap: true,
      manualDisconnect: false,
      unmounted: false,
      ownershipCurrent: true,
    })

    it.each([
      [
        'adopts a live link despite the error',
        'GATT connection timeout',
        { linkUp: true },
        { kind: 'adopt-live-link' },
      ],
      [
        'an aborted attempt never adopts',
        'Failed: GATT busy',
        { linkUp: true, aborted: true },
        {
          kind: 'busy-retry',
          delayMs: BUSY_RETRY_DELAYS_MS[0],
          retryNumber: 1,
        },
      ],
      [
        'busy radio retries on the escalating schedule',
        'Failed: GATT busy',
        {},
        {
          kind: 'busy-retry',
          delayMs: BUSY_RETRY_DELAYS_MS[0],
          retryNumber: 1,
        },
      ],
      [
        'later busy retries use later delays',
        'Failed: GATT busy',
        { busyRetriesUsed: 1 },
        {
          kind: 'busy-retry',
          delayMs: BUSY_RETRY_DELAYS_MS[1],
          retryNumber: 2,
        },
      ],
      [
        'busy radio gives up at the schedule bound',
        'Failed: GATT busy',
        { busyRetriesUsed: BUSY_RETRY_DELAYS_MS.length },
        { kind: 'fail' },
      ],
      [
        'quiet strap misses take the staggered schedule',
        'Bluetooth Device is no longer in range.',
        {},
        {
          kind: 'quiet-retry',
          delayMs: QUIET_STRAP_RETRY_DELAYS_MS[0],
          retryNumber: 1,
        },
      ],
      [
        'later quiet retries use later delays',
        'Bluetooth Device is no longer in range.',
        { quietRetriesUsed: 1 },
        {
          kind: 'quiet-retry',
          delayMs: QUIET_STRAP_RETRY_DELAYS_MS[1],
          retryNumber: 2,
        },
      ],
      [
        'exhausted quiet schedule fails',
        'Bluetooth Device is no longer in range.',
        { quietRetriesUsed: QUIET_STRAP_RETRY_DELAYS_MS.length },
        { kind: 'fail' },
      ],
      [
        'busy text with an in-range miss routes to the quiet schedule',
        'busy radio, device no longer in range',
        {},
        {
          kind: 'quiet-retry',
          delayMs: QUIET_STRAP_RETRY_DELAYS_MS[0],
          retryNumber: 1,
        },
      ],
      [
        'quiet retry disabled fails',
        'Bluetooth Device is no longer in range.',
        { retryQuietStrap: false },
        { kind: 'fail' },
      ],
      [
        'manual disconnect cancels quiet retry',
        'Bluetooth Device is no longer in range.',
        { manualDisconnect: true },
        { kind: 'fail' },
      ],
      [
        'unmount cancels quiet retry',
        'Bluetooth Device is no longer in range.',
        { unmounted: true },
        { kind: 'fail' },
      ],
      [
        'superseded attempt cancels quiet retry',
        'Bluetooth Device is no longer in range.',
        { ownershipCurrent: false },
        { kind: 'fail' },
      ],
      [
        'genuine timeout fails',
        'GATT connection timeout',
        {},
        { kind: 'fail' },
      ],
      ['abort fails', 'Connection aborted', {}, { kind: 'fail' }],
    ])('%s', (_name, text, overrides, expected) => {
      expect(
        classifyGattConnectError(text, { ...baseState(), ...overrides })
      ).toEqual(expected)
    })
  })

  describe('resolveConnectDevice', () => {
    const fakeDevice = { id: 'd1', name: 'HRM' } as unknown as BluetoothDevice

    it('returns the already-known device without scanning', async () => {
      const findSavedDevice = jest.fn()
      const onScanning = jest.fn()
      await expect(
        resolveConnectDevice(false, {
          savedDevice: fakeDevice,
          findSavedDevice,
          onScanning,
        })
      ).resolves.toBe(fakeDevice)
      expect(findSavedDevice).not.toHaveBeenCalled()
      expect(onScanning).not.toHaveBeenCalled()
      expect(mockBluetooth.requestDevice).not.toHaveBeenCalled()
    })

    it('falls back to a found saved device', async () => {
      const findSavedDevice = jest.fn().mockResolvedValue(fakeDevice)
      const onScanning = jest.fn()
      await expect(
        resolveConnectDevice(false, {
          savedDevice: null,
          findSavedDevice,
          onScanning,
        })
      ).resolves.toBe(fakeDevice)
      expect(findSavedDevice).toHaveBeenCalledWith(false)
      expect(mockBluetooth.requestDevice).not.toHaveBeenCalled()
    })

    it('opens the picker for a manual attempt with no device', async () => {
      const findSavedDevice = jest.fn().mockResolvedValue(null)
      const onScanning = jest.fn()
      await expect(
        resolveConnectDevice(false, {
          savedDevice: null,
          findSavedDevice,
          onScanning,
        })
      ).resolves.toBe(mockDevice)
      expect(onScanning).toHaveBeenCalledTimes(1)
      expect(mockBluetooth.requestDevice).toHaveBeenCalledTimes(1)
    })

    it('returns null for a silent attempt with no device (never picks)', async () => {
      const findSavedDevice = jest.fn().mockResolvedValue(null)
      const onScanning = jest.fn()
      await expect(
        resolveConnectDevice(true, {
          savedDevice: null,
          findSavedDevice,
          onScanning,
        })
      ).resolves.toBeNull()
      expect(findSavedDevice).toHaveBeenCalledWith(true)
      expect(onScanning).not.toHaveBeenCalled()
      expect(mockBluetooth.requestDevice).not.toHaveBeenCalled()
    })

    it('propagates picker cancellation to the caller', async () => {
      const findSavedDevice = jest.fn().mockResolvedValue(null)
      mockBluetooth.requestDevice.mockRejectedValueOnce(
        new DOMException('User cancelled', 'NotFoundError')
      )
      await expect(
        resolveConnectDevice(false, {
          savedDevice: null,
          findSavedDevice,
          onScanning: jest.fn(),
        })
      ).rejects.toMatchObject({ name: 'NotFoundError' })
    })
  })

  describe('teardownTestControls', () => {
    const makeControls = (): HrmTestControls =>
      ({
        setHrmStatus: jest.fn(),
        setCustomHrmStatusMessage: jest.fn(),
        setSignalStatus: jest.fn(),
      }) as unknown as HrmTestControls

    afterEach(() => {
      delete window.__TEST_CONTROLS__
    })

    it('removes only slots that still hold the installed functions', () => {
      const first = makeControls()
      const second = makeControls()
      window.__TEST_CONTROLS__ = { ...first }
      // A remount overwrites the slots with its own wrappers.
      window.__TEST_CONTROLS__ = { ...second }

      // A stale unmount must not delete the remount's controls.
      teardownTestControls(first)
      expect(window.__TEST_CONTROLS__?.setHrmStatus).toBe(second.setHrmStatus)
      expect(window.__TEST_CONTROLS__?.setCustomHrmStatusMessage).toBe(
        second.setCustomHrmStatusMessage
      )
      expect(window.__TEST_CONTROLS__?.setSignalStatus).toBe(
        second.setSignalStatus
      )

      teardownTestControls(second)
      expect(window.__TEST_CONTROLS__?.setHrmStatus).toBeUndefined()
      expect(
        window.__TEST_CONTROLS__?.setCustomHrmStatusMessage
      ).toBeUndefined()
      expect(window.__TEST_CONTROLS__?.setSignalStatus).toBeUndefined()
    })

    it('tolerates missing controls', () => {
      delete window.__TEST_CONTROLS__
      expect(() => teardownTestControls(makeControls())).not.toThrow()
    })
  })

  describe('auto-connect failure surfacing', () => {
    it('shows the specific range message when GATT reports out of range', async () => {
      ;(Cookies.get as jest.Mock).mockReturnValue('test-device-id')
      mockBluetooth.getDevices.mockResolvedValue([mockDevice])
      mockGatt.connect.mockRejectedValue(
        new DOMException(
          'Bluetooth Device is no longer in range.',
          'NetworkError'
        )
      )
      const { result } = renderHook(() => useBluetoothHRM())

      let autoPromise: Promise<void> | undefined
      act(() => {
        autoPromise = result.current.autoConnect()
      })
      await act(async () => {
        await jest.advanceTimersByTimeAsync(40000)
        await autoPromise
      })

      // Silent retries (wave-16): a quiet strap gets 4 attempts over ~35s
      // (the old #9303 fail-fast never caught a waking strap); exhaustion
      // now waits for the strap instead of failing dead (issue 9806).
      expect(mockGatt.connect).toHaveBeenCalledTimes(4)
      expect(result.current.deviceStatus).toBe(
        BLUETOOTH_MESSAGES.waitingForDevice('Test HRM')
      )
    })

    it('retries a quiet strap and connects when it wakes', async () => {
      ;(Cookies.get as jest.Mock).mockReturnValue('test-device-id')
      mockBluetooth.getDevices.mockResolvedValue([mockDevice])
      mockGatt.connect
        .mockRejectedValueOnce(
          new DOMException(
            'Bluetooth Device is no longer in range.',
            'NetworkError'
          )
        )
        .mockResolvedValue(mockGatt)
      const { result } = renderHook(() => useBluetoothHRM())

      let autoPromise: Promise<void> | undefined
      act(() => {
        autoPromise = result.current.autoConnect()
      })
      await act(async () => {
        await jest.advanceTimersByTimeAsync(40000)
        await autoPromise
      })

      expect(mockGatt.connect).toHaveBeenCalledTimes(2)
      expect(result.current.isConnected).toBe(true)
    })

    it('cancels silent retries after a manual disconnect', async () => {
      ;(Cookies.get as jest.Mock).mockReturnValue('test-device-id')
      mockBluetooth.getDevices.mockResolvedValue([mockDevice])
      mockGatt.connect.mockRejectedValue(
        new DOMException(
          'Bluetooth Device is no longer in range.',
          'NetworkError'
        )
      )
      const { result } = renderHook(() => useBluetoothHRM())

      let autoPromise: Promise<void> | undefined
      act(() => {
        autoPromise = result.current.autoConnect()
      })
      // Let the first attempt fail, then disconnect mid-retry-wait.
      await act(async () => {
        await jest.advanceTimersByTimeAsync(1000)
      })
      act(() => {
        result.current.disconnect()
      })
      await act(async () => {
        await jest.advanceTimersByTimeAsync(40000)
        await autoPromise
      })

      expect(mockGatt.connect).toHaveBeenCalledTimes(1)
      expect(result.current.isConnected).toBe(false)
    })

    it('stale silent failure does not clobber a newer manual attempt', async () => {
      ;(Cookies.get as jest.Mock).mockReturnValue('test-device-id')
      // Silent path pends on getDevices; the interleaved manual attempt
      // finds the saved device and connects fully.
      let rejectGetDevices!: (error: unknown) => void
      mockBluetooth.getDevices
        .mockReturnValueOnce(
          new Promise<MockBluetoothDevice[]>((_, reject) => {
            rejectGetDevices = reject
          })
        )
        .mockResolvedValue([mockDevice])
      const { result } = renderHook(() => useBluetoothHRM())

      // Silent auto-connect starts and pends on getDevices.
      let silentDone!: Promise<void>
      await act(async () => {
        silentDone = result.current
          .connectAndStream(undefined, undefined, { silent: true })
          .then(
            () => undefined,
            () => undefined
          )
      })

      // Manual attempt interleaves: claims ownership and connects.
      await act(async () => {
        await result.current.connectAndStream('Ann', 30)
      })
      expect(result.current.isConnected).toBe(true)
      expect(result.current.deviceStatus).toBe('Connected to: Test HRM')

      // Silent attempt now fails; the ownership-guarded reset must skip,
      // leaving the live connection (not Disconnected) in place.
      await act(async () => {
        rejectGetDevices(new Error('GATT connection timeout'))
        await silentDone
      })
      expect(result.current.isConnected).toBe(true)
      expect(result.current.deviceStatus).toBe('Connected to: Test HRM')
    })

    it('cancels silent retries on unmount', async () => {
      ;(Cookies.get as jest.Mock).mockReturnValue('test-device-id')
      mockBluetooth.getDevices.mockResolvedValue([mockDevice])
      mockGatt.connect.mockRejectedValue(
        new DOMException(
          'Bluetooth Device is no longer in range.',
          'NetworkError'
        )
      )
      const { result, unmount } = renderHook(() => useBluetoothHRM())

      let autoPromise: Promise<void> | undefined
      act(() => {
        autoPromise = result.current.autoConnect()
      })
      // Let the first attempt fail, then unmount mid-retry-wait.
      await act(async () => {
        await jest.advanceTimersByTimeAsync(1000)
      })
      act(() => {
        unmount()
      })
      await act(async () => {
        await jest.advanceTimersByTimeAsync(40000)
        await autoPromise
      })

      expect(mockGatt.connect).toHaveBeenCalledTimes(1)
    })

    it('does not log a stale abort warning across sequential attempts', async () => {
      ;(Cookies.get as jest.Mock).mockReturnValue('test-device-id')
      mockBluetooth.getDevices.mockResolvedValue([mockDevice])
      mockGatt.connect.mockRejectedValue(new Error('Connection failed'))
      const { result } = renderHook(() => useBluetoothHRM())

      await act(async () => {
        await result.current.autoConnect()
      })
      await act(async () => {
        await result.current.autoConnect()
      })

      const abortWarns = (logger.warn as jest.Mock).mock.calls.filter(
        (call) => call[1] === 'Aborting previous pending connection attempt'
      )
      expect(abortWarns).toHaveLength(0)
    })
  })

  describe('connect progress visibility', () => {
    it('surfaces quiet-retry progress while waiting for a strap', async () => {
      ;(Cookies.get as jest.Mock).mockReturnValue('test-device-id')
      mockBluetooth.getDevices.mockResolvedValue([mockDevice])
      mockGatt.connect.mockRejectedValue(
        new DOMException(
          'Bluetooth Device is no longer in range.',
          'NetworkError'
        )
      )
      const { result } = renderHook(() => useBluetoothHRM())

      let autoPromise: Promise<void> | undefined
      act(() => {
        autoPromise = result.current.autoConnect()
      })
      // First attempt fails fast; the 5s wait must say what is happening.
      await act(async () => {
        await jest.advanceTimersByTimeAsync(1000)
      })
      expect(result.current.deviceStatus).toBe(
        'Strap is quiet. Retrying... (Attempt 1/3)'
      )
      // Second attempt fails after its wait; progress advances.
      await act(async () => {
        await jest.advanceTimersByTimeAsync(5000)
      })
      expect(result.current.deviceStatus).toBe(
        'Strap is quiet. Retrying... (Attempt 2/3)'
      )
      // Exhaustion now waits for the strap instead of failing dead.
      await act(async () => {
        await jest.advanceTimersByTimeAsync(40000)
        await autoPromise
      })
      expect(result.current.deviceStatus).toBe(
        BLUETOOTH_MESSAGES.waitingForDevice('Test HRM')
      )
    })

    it('keeps quiet-retry progress when a manual tap is skipped behind it', async () => {
      ;(Cookies.get as jest.Mock).mockReturnValue('test-device-id')
      mockBluetooth.getDevices.mockResolvedValue([mockDevice])
      mockGatt.connect.mockRejectedValue(
        new DOMException(
          'Bluetooth Device is no longer in range.',
          'NetworkError'
        )
      )
      const { result } = renderHook(() => useBluetoothHRM())

      let autoPromise: Promise<void> | undefined
      act(() => {
        autoPromise = result.current.autoConnect()
      })
      await act(async () => {
        await jest.advanceTimersByTimeAsync(1000)
      })
      // A manual tap while the silent attempt owns the radio is skipped and
      // claims nothing, so the silent progress keeps surfacing.
      let manualResult: boolean | undefined
      await act(async () => {
        manualResult = await result.current.connectAndStream('VRT', 30)
      })
      expect(manualResult).toBe(false)
      await act(async () => {
        await jest.advanceTimersByTimeAsync(5000)
      })
      expect(result.current.deviceStatus).toBe(
        'Strap is quiet. Retrying... (Attempt 2/3)'
      )
      await act(async () => {
        await jest.advanceTimersByTimeAsync(40000)
        await autoPromise
      })
    })

    it('surfaces busy fast-retry progress', async () => {
      ;(Cookies.get as jest.Mock).mockReturnValue('test-device-id')
      mockBluetooth.getDevices.mockResolvedValue([mockDevice])
      mockGatt.connect.mockRejectedValue(
        new DOMException('GATT connection busy', 'NetworkError')
      )
      const { result } = renderHook(() => useBluetoothHRM())

      let autoPromise: Promise<void> | undefined
      act(() => {
        autoPromise = result.current.autoConnect()
      })
      await act(async () => {
        await jest.advanceTimersByTimeAsync(500)
      })
      expect(result.current.deviceStatus).toBe(
        'Device busy. Retrying in 1s... (1/3)'
      )
      await act(async () => {
        await jest.advanceTimersByTimeAsync(10000)
        await autoPromise
      })
      expect(result.current.deviceStatus).toBe(
        BLUETOOTH_MESSAGES.waitingForDevice('Test HRM')
      )
    })
  })

  describe('slow-link adoption', () => {
    it('adopts a link that comes up after our timeout instead of failing', async () => {
      ;(Cookies.get as jest.Mock).mockReturnValue('test-device-id')
      mockBluetooth.getDevices.mockResolvedValue([mockDevice])
      // First radio call hangs past the 20s timer; the link itself is up.
      // Adoption uses the live server object directly: zero new radio ops,
      // so no second connect() that could collide with the pending one.
      mockGatt.connect.mockImplementationOnce(() => new Promise(() => {}))
      mockGatt.connected = true
      const { result } = renderHook(() => useBluetoothHRM())

      let connectPromise: Promise<boolean> | undefined
      act(() => {
        connectPromise = result.current.connectAndStream('VRT', 30)
      })
      await act(async () => {
        await jest.advanceTimersByTimeAsync(25000)
        await expect(connectPromise).resolves.toBe(true)
      })

      expect(mockGatt.connect).toHaveBeenCalledTimes(1)
      expect(mockGatt.disconnect).not.toHaveBeenCalled()
      expect(result.current.isConnected).toBe(true)
    })

    it('adopts a live link on an instant "no longer in range" error', async () => {
      ;(Cookies.get as jest.Mock).mockReturnValue('test-device-id')
      mockBluetooth.getDevices.mockResolvedValue([mockDevice])
      // BlueZ can raise an instant miss while the OS link is already up;
      // the live link must be adopted, not severed by the zombie killer.
      mockGatt.connect.mockRejectedValue(
        new DOMException(
          'Bluetooth Device is no longer in range.',
          'NetworkError'
        )
      )
      mockGatt.connected = true
      const { result } = renderHook(() => useBluetoothHRM())

      let connectPromise: Promise<boolean> | undefined
      act(() => {
        connectPromise = result.current.connectAndStream('VRT', 30)
      })
      await act(async () => {
        await jest.advanceTimersByTimeAsync(40000)
        await expect(connectPromise).resolves.toBe(true)
      })

      // Adopted on the first error: zero additional radio ops, the
      // zombie sever never runs, and no quiet-retry sleep is entered.
      expect(mockGatt.connect).toHaveBeenCalledTimes(1)
      expect(mockGatt.disconnect).not.toHaveBeenCalled()
      expect(result.current.isConnected).toBe(true)
    })

    it('keeps the saved device on a genuine timeout (link down)', async () => {
      ;(Cookies.get as jest.Mock).mockReturnValue('test-device-id')
      mockBluetooth.getDevices.mockResolvedValue([mockDevice])
      mockGatt.connect.mockImplementation(() => new Promise(() => {}))
      mockGatt.connected = false
      const { result } = renderHook(() => useBluetoothHRM())

      let connectPromise: Promise<boolean> | undefined
      act(() => {
        connectPromise = result.current.connectAndStream('VRT', 30)
      })
      await act(async () => {
        await jest.advanceTimersByTimeAsync(25000)
        await expect(connectPromise).rejects.toThrow(/timeout/i)
      })
      // Let any delayed timers (there must be no wipe timer) flush.
      await act(async () => {
        await jest.advanceTimersByTimeAsync(10000)
      })

      // One radio attempt (timeouts fail fast, no busy retry), timeout
      // message surfaced, and — critically — no permission wipe.
      expect(mockGatt.connect).toHaveBeenCalledTimes(1)
      expect(result.current.deviceStatus).toContain(
        BLUETOOTH_MESSAGES.connectionTimeout
      )
      expect(Cookies.remove).not.toHaveBeenCalled()
    })
  })
})
