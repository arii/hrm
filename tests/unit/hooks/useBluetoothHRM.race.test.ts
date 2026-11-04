/**
 * @jest-environment jsdom
 */
import { renderHook, act, waitFor } from '@testing-library/react'
import useBluetoothHRM from '@/hooks/useBluetoothHRM'
import { clientEnv } from '@/lib/env-client'
import Cookies from 'js-cookie'

const mockBluetooth = {
  getAvailability: jest.fn().mockResolvedValue(true),
  requestDevice: jest.fn(),
  getDevices: jest.fn().mockResolvedValue([]),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
}

// Mock the WebSocket context
jest.mock('@/context/WebSocketContext', () => ({
  useWebSocket: () => ({
    sendData: jest.fn(),
    connectionStatus: 'Connected',
  }),
}))

// Mock cookie utilities
jest.mock('js-cookie', () => ({
  get: jest.fn(),
  set: jest.fn(),
  remove: jest.fn(),
}))

describe('useBluetoothHRM Race Conditions', () => {
  let infoSpy: jest.SpyInstance
  let warnSpy: jest.SpyInstance

  beforeAll(() => {
    infoSpy = jest.spyOn(console, 'info').mockImplementation(() => {})
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterAll(() => {
    infoSpy.mockRestore()
    warnSpy.mockRestore()
  })

  const originalNavigator = global.navigator
  let mockRequestDevice: jest.Mock
  let mockGattConnect: jest.Mock
  let mockAbort: jest.Mock

  beforeEach(() => {
    // Reset mocks before each test to ensure isolation
    mockAbort = jest.fn()
    mockGattConnect = jest.fn().mockImplementation(() => {
      // Simulate a connection that can be aborted
      return new Promise((resolve, reject) => {
        const signal = (
          global as unknown as { mockAbortControllerSignal: AbortSignal }
        ).mockAbortControllerSignal
        if (signal?.aborted) {
          const error = new DOMException('Connection cancelled', 'AbortError')
          reject(error)
          return
        }
        signal?.addEventListener('abort', () => {
          const error = new DOMException('Connection cancelled', 'AbortError')
          reject(error)
        })
        // Simulate a delay in connection
        const mockCharacteristic = {
          startNotifications: jest.fn().mockResolvedValue(undefined),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
        }
        const mockService = {
          getCharacteristic: jest.fn().mockResolvedValue(mockCharacteristic),
        }
        const mockServer = {
          getPrimaryService: jest.fn().mockResolvedValue(mockService),
          disconnect: jest.fn(),
        }
        setTimeout(() => resolve(mockServer), 200)
      })
    })

    mockRequestDevice = jest.fn().mockResolvedValue({
      id: 'test-device-id',
      name: 'Test HRM',
      gatt: {
        connect: mockGattConnect,
        disconnect: jest.fn(),
      },
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    })

    // Safe mocking
    Object.defineProperty(global, 'navigator', {
      value: {
        ...originalNavigator,
        bluetooth: {
          ...mockBluetooth,
          requestDevice: mockRequestDevice,
          getDevices: jest.fn().mockResolvedValue([]),
        },
      },
      writable: true,
    })

    // Mock AbortController
    global.AbortController = jest.fn().mockImplementation(() => {
      const listeners: (() => void)[] = []
      const signal = {
        aborted: false,
        addEventListener: (event: string, listener: () => void) => {
          if (event === 'abort') {
            listeners.push(listener)
          }
        },
        removeEventListener: jest.fn(),
        reason: undefined,
        throwIfAborted: jest.fn(),
        onabort: null,
      }
      ;(
        global as unknown as { mockAbortControllerSignal: AbortSignal }
      ).mockAbortControllerSignal = signal
      return {
        signal,
        abort: () => {
          mockAbort() // Track the abort call
          signal.aborted = true
          listeners.forEach((listener) => listener())
        },
      }
    }) as jest.Mock
  })

  afterEach(() => {
    // Restore original
    Object.defineProperty(global, 'navigator', {
      value: originalNavigator,
      writable: true,
    })
    jest.clearAllMocks()
    delete (global as unknown as { mockAbortControllerSignal: AbortSignal })
      .mockAbortControllerSignal
    // In case a fake-timer test failed mid-flight, never leak into others.
    jest.useRealTimers()
  })

  it('ignores subsequent connection attempts while one is in progress', async () => {
    const { result } = renderHook(() => useBluetoothHRM())

    let firstPromise: Promise<boolean> | undefined
    let secondPromise: Promise<boolean> | undefined
    act(() => {
      firstPromise = result.current.connectAndStream()
      secondPromise = result.current.connectAndStream()
    })

    await act(async () => {
      await expect(firstPromise).resolves.toBe(true)
      // The second call is skipped (in-flight guard) and honestly reports
      // false — it did not connect. (It previously fell through to true;
      // the sibling 'second call while in flight' test asserts false for
      // the same situation.) The critical check is that gatt.connect is
      // called only once.
      await expect(secondPromise).resolves.toBe(false)
    })

    expect(mockGattConnect).toHaveBeenCalledTimes(1)
    expect(mockAbort).not.toHaveBeenCalled()
    expect(result.current.isConnected).toBe(true)
  })

  it('does not throw error if a new connection is initiated after the first one is complete', async () => {
    const { result } = renderHook(() => useBluetoothHRM())

    await act(async () => {
      await result.current.connectAndStream()
    })

    await act(async () => {
      await result.current.connectAndStream()
    })

    expect(mockGattConnect).toHaveBeenCalledTimes(1)
    expect(mockAbort).toHaveBeenCalledTimes(0)
    expect(result.current.isConnected).toBe(true)
  })

  it('attempts connection only once when autoConnect is called multiple times concurrently', async () => {
    ;(Cookies.get as jest.Mock).mockReturnValue('test-device-id')

    const mockSavedDevice = {
      id: 'test-device-id',
      name: 'Saved HRM',
      gatt: {
        connect: mockGattConnect,
        disconnect: jest.fn(),
      },
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }
    Object.defineProperty(global.navigator, 'bluetooth', {
      value: {
        ...mockBluetooth,
        getDevices: jest.fn().mockResolvedValue([mockSavedDevice]),
      },
      writable: true,
    })

    const { result } = renderHook(() => useBluetoothHRM())

    await act(async () => {
      const autoConnectPromises = [
        result.current.autoConnect(),
        result.current.autoConnect(),
        result.current.autoConnect(),
      ]
      await Promise.allSettled(autoConnectPromises)
    })

    expect(mockGattConnect).toHaveBeenCalledTimes(1)
    expect(result.current.isConnected).toBe(true)
  })

  it('retries not-in-range on a quiet-strap schedule, not busy fast-retries', async () => {
    jest.useFakeTimers()
    try {
      mockGattConnect.mockRejectedValue(
        new DOMException(
          'Bluetooth Device is no longer in range.',
          'NetworkError'
        )
      )
      const { result } = renderHook(() => useBluetoothHRM())

      let connectPromise: Promise<boolean> | undefined
      act(() => {
        connectPromise = result.current.connectAndStream()
      })
      await act(async () => {
        // Attempts at ~0/5/15/35s, then the terminal failure surfaces.
        await jest.advanceTimersByTimeAsync(40000)
        await expect(connectPromise).rejects.toThrow('no longer in range')
      })

      // Four patient attempts (not busy fast-retries: no 1s-cycle hammering).
      expect(mockGattConnect).toHaveBeenCalledTimes(4)
      expect(result.current.isConnected).toBe(false)
    } finally {
      jest.useRealTimers()
    }
  })

  it('still fast-retries a genuinely busy radio', async () => {
    mockGattConnect
      .mockRejectedValueOnce(
        new DOMException('GATT connection busy', 'NetworkError')
      )
      .mockImplementationOnce(() => {
        const mockCharacteristic = {
          startNotifications: jest.fn().mockResolvedValue(undefined),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
        }
        const mockService = {
          getCharacteristic: jest.fn().mockResolvedValue(mockCharacteristic),
        }
        const mockServer = {
          getPrimaryService: jest.fn().mockResolvedValue(mockService),
          disconnect: jest.fn(),
        }
        return Promise.resolve(mockServer)
      })
    const { result } = renderHook(() => useBluetoothHRM())

    await act(async () => {
      await expect(result.current.connectAndStream()).resolves.toBe(true)
    })

    expect(mockGattConnect).toHaveBeenCalledTimes(2)
    expect(result.current.isConnected).toBe(true)
  })

  it('does not abort a stale controller on retry after failure', async () => {
    // Fake timers: each failing call now runs the 35s quiet-retry schedule.
    jest.useFakeTimers()
    try {
      mockGattConnect.mockRejectedValue(
        new DOMException(
          'Bluetooth Device is no longer in range.',
          'NetworkError'
        )
      )
      const { result } = renderHook(() => useBluetoothHRM())

      await act(async () => {
        const first = result.current.connectAndStream()
        await jest.advanceTimersByTimeAsync(40000)
        await expect(first).rejects.toThrow()
      })
      await act(async () => {
        const second = result.current.connectAndStream()
        await jest.advanceTimersByTimeAsync(40000)
        await expect(second).rejects.toThrow()
      })

      // 4 quiet attempts per call, no cross-attempt abort churn.
      expect(mockGattConnect).toHaveBeenCalledTimes(8)
      expect(mockAbort).not.toHaveBeenCalled()
      expect(warnSpy).not.toHaveBeenCalledWith(
        expect.anything(),
        'Aborting previous pending connection attempt'
      )
    } finally {
      jest.useRealTimers()
    }
  })

  it('returns false for a second call while GATT is in flight', async () => {
    let releaseConnect!: (server: unknown) => void
    mockGattConnect.mockImplementation(
      () =>
        new Promise((resolve) => {
          releaseConnect = resolve as (server: unknown) => void
        })
    )
    const { result } = renderHook(() => useBluetoothHRM())

    let firstPromise!: Promise<boolean>
    act(() => {
      firstPromise = result.current.connectAndStream()
    })
    await waitFor(() => expect(mockGattConnect).toHaveBeenCalledTimes(1))

    let secondResult: boolean | undefined
    await act(async () => {
      secondResult = await result.current.connectAndStream()
    })

    expect(secondResult).toBe(false)
    expect(mockGattConnect).toHaveBeenCalledTimes(1)

    const mockCharacteristic = {
      startNotifications: jest.fn().mockResolvedValue(undefined),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }
    const mockService = {
      getCharacteristic: jest.fn().mockResolvedValue(mockCharacteristic),
    }
    await act(async () => {
      releaseConnect({
        getPrimaryService: jest.fn().mockResolvedValue(mockService),
        disconnect: jest.fn(),
      })
      await expect(firstPromise).resolves.toBe(true)
    })
    expect(result.current.isConnected).toBe(true)
  })

  it('stale silent auto-connect failure does not wipe injected newer state', async () => {
    // The hook installs window.__TEST_CONTROLS__ when
    // clientEnv.NEXT_PUBLIC_TESTING is set (read at effect time).
    const prevTesting = clientEnv.NEXT_PUBLIC_TESTING
    clientEnv.NEXT_PUBLIC_TESTING = 'true'
    // Fake timers: the stale attempt runs the quiet-retry schedule (5s
    // sleep) plus the 20s radio timer on its second hanging attempt.
    jest.useFakeTimers()
    try {
      await runStaleInjectionScenario()
    } finally {
      clientEnv.NEXT_PUBLIC_TESTING = prevTesting
      jest.useRealTimers()
    }

    async function runStaleInjectionScenario() {
      ;(Cookies.get as jest.Mock).mockReturnValue('test-device-id')
      let rejectConnect!: (error: unknown) => void
      mockGattConnect.mockImplementation(
        () =>
          new Promise((_resolve, reject) => {
            rejectConnect = reject
          })
      )
      const mockSavedDevice = {
        id: 'test-device-id',
        name: 'Saved HRM',
        gatt: {
          connect: mockGattConnect,
          disconnect: jest.fn(),
        },
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      }
      Object.defineProperty(global.navigator, 'bluetooth', {
        value: {
          ...mockBluetooth,
          getDevices: jest.fn().mockResolvedValue([mockSavedDevice]),
        },
        writable: true,
      })

      const { result, unmount } = renderHook(() => useBluetoothHRM())
      await act(async () => {})
      expect(window.__TEST_CONTROLS__?.setCustomHrmStatusMessage).toBeDefined()

      let autoPromise!: Promise<void>
      act(() => {
        autoPromise = result.current.autoConnect()
      })
      await act(async () => {
        await jest.advanceTimersByTimeAsync(0)
      })
      expect(mockGattConnect).toHaveBeenCalledTimes(1)

      // A newer operation (VRT state injection) claims UI ownership mid-flight.
      const injectedMessage = 'Scanning for HRM...'
      act(() => {
        window.__TEST_CONTROLS__!.setCustomHrmStatusMessage!(injectedMessage)
      })
      expect(result.current.deviceStatus).toBe(injectedMessage)

      // The stale silent attempt now fails (not-in-range → one quiet retry
      // that hangs into the 20s radio timer). Its completion must not
      // overwrite the injected state with an auto-connect failure banner.
      await act(async () => {
        rejectConnect(
          new DOMException(
            'Bluetooth Device is no longer in range.',
            'NetworkError'
          )
        )
        await jest.advanceTimersByTimeAsync(30000)
        await autoPromise
      })

      expect(result.current.deviceStatus).toBe(injectedMessage)
      unmount()
      delete window.__TEST_CONTROLS__
    }
  })

  it('removes injected test controls on unmount', async () => {
    const prevTesting = clientEnv.NEXT_PUBLIC_TESTING
    clientEnv.NEXT_PUBLIC_TESTING = 'true'
    try {
      const { unmount } = renderHook(() => useBluetoothHRM())
      await act(async () => {})
      expect(window.__TEST_CONTROLS__?.setHrmStatus).toBeDefined()
      expect(window.__TEST_CONTROLS__?.setCustomHrmStatusMessage).toBeDefined()
      expect(window.__TEST_CONTROLS__?.setSignalStatus).toBeDefined()

      unmount()

      expect(window.__TEST_CONTROLS__?.setHrmStatus).toBeUndefined()
      expect(
        window.__TEST_CONTROLS__?.setCustomHrmStatusMessage
      ).toBeUndefined()
      expect(window.__TEST_CONTROLS__?.setSignalStatus).toBeUndefined()
    } finally {
      clientEnv.NEXT_PUBLIC_TESTING = prevTesting
      delete window.__TEST_CONTROLS__
    }
  })
})
