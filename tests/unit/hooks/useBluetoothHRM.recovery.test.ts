/**
 * @jest-environment jsdom
 */
import { renderHook, act, waitFor } from '@testing-library/react'
import useBluetoothHRM from '@/hooks/useBluetoothHRM'
import {
  STUCK_CHECK_INTERVAL_MS,
  STUCK_CONNECT_TIMEOUT_MS,
} from '@/constants/bluetooth-reconnection'
import { BLUETOOTH_MESSAGES } from '@/constants/bluetooth-messages'
import logger from '@/utils/logger'
import * as WebSocketContext from '@/context/WebSocketContext'
import Cookies from 'js-cookie'

jest.mock('@/context/WebSocketContext')
jest.mock('js-cookie', () => ({
  get: jest.fn(),
  set: jest.fn(),
  remove: jest.fn(),
}))
jest.mock('@/utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}))

const setupDrop = () =>
  new DOMException(
    'GATT Server is disconnected. Cannot retrieve services. (Re)connect first with device.gatt.connect.',
    'NetworkError'
  )

const loggedMessages = (level: 'info' | 'warn' | 'error') =>
  (logger[level] as jest.Mock).mock.calls.map((call) =>
    typeof call[0] === 'string' ? call[0] : call[1]
  )

describe('useBluetoothHRM in-page recovery', () => {
  let listeners: Record<string, (event?: Event) => void>
  let mockGatt: {
    connect: jest.Mock
    disconnect: jest.Mock
    getPrimaryService: jest.Mock
    connected?: boolean
  }
  let mockDevice: {
    id: string
    name: string
    gatt: typeof mockGatt
    forget: jest.Mock
    addEventListener: jest.Mock
    removeEventListener: jest.Mock
  }
  let mockBluetooth: { requestDevice: jest.Mock; getDevices: jest.Mock }
  let mockService: { getCharacteristic: jest.Mock }

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    jest.spyOn(WebSocketContext, 'useWebSocketConnection').mockReturnValue({
      sendData: jest.fn(),
      connectionStatus: 'Connected',
      connect: jest.fn(),
      disconnect: jest.fn(),
    })
    ;(Cookies.get as jest.Mock).mockReturnValue('')

    const characteristic = {
      startNotifications: jest.fn().mockResolvedValue(undefined),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }
    mockService = {
      getCharacteristic: jest.fn().mockResolvedValue(characteristic),
    }
    mockGatt = {
      connect: jest.fn(),
      disconnect: jest.fn(),
      getPrimaryService: jest.fn().mockResolvedValue(mockService),
    }
    mockGatt.connect.mockResolvedValue(mockGatt)
    listeners = {}
    mockDevice = {
      id: 'hr6',
      name: 'HR6 0050855',
      gatt: mockGatt,
      forget: jest.fn().mockResolvedValue(undefined),
      addEventListener: jest.fn((name: string, cb: () => void) => {
        listeners[name] = cb
      }),
      removeEventListener: jest.fn(),
    }
    mockBluetooth = {
      requestDevice: jest.fn().mockResolvedValue(mockDevice),
      getDevices: jest.fn().mockResolvedValue([mockDevice]),
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

  // Chrome fires gattserverdisconnected, then service discovery rejects:
  // the order seen in the 2A console log.
  const dropDuringSetup = () => {
    listeners.gattserverdisconnected?.()
    return Promise.reject(setupDrop())
  }

  it('retries a link that drops during setup instead of failing', async () => {
    mockGatt.getPrimaryService.mockImplementationOnce(dropDuringSetup)
    const { result } = renderHook(() => useBluetoothHRM())

    let connected: Promise<boolean> | undefined
    act(() => {
      connected = result.current.connectAndStream('Ari', 30)
    })
    await act(async () => {
      await jest.advanceTimersByTimeAsync(1000)
    })

    await expect(connected).resolves.toBe(true)
    expect(mockGatt.connect).toHaveBeenCalledTimes(2)
    expect(result.current.deviceStatus).toBe('Connected to: HR6 0050855')
    expect(loggedMessages('warn')).toContain(
      'Link dropped during setup; reconnecting'
    )
  })

  it('shows one failure, with no background reconnect racing it, once setup retries run out', async () => {
    mockGatt.getPrimaryService.mockImplementation(dropDuringSetup)
    const { result } = renderHook(() => useBluetoothHRM())

    let connected: Promise<boolean> | undefined
    act(() => {
      connected = result.current.connectAndStream('Ari', 30)
    })
    const settled = connected!.catch((error: unknown) => error)
    await act(async () => {
      await jest.advanceTimersByTimeAsync(3000)
    })
    expect(await settled).toMatchObject({ name: 'NetworkError' })
    expect(result.current.deviceStatus).toBe(
      BLUETOOTH_MESSAGES.errorWithDetails(BLUETOOTH_MESSAGES.connectionFailed)
    )

    // The drops arrived mid-handshake, so no reconnect loop was armed to
    // overwrite the failure or hold the radio.
    await act(async () => {
      await jest.advanceTimersByTimeAsync(30000)
    })
    expect(mockGatt.connect).toHaveBeenCalledTimes(3)
    expect(result.current.deviceStatus).toBe(
      BLUETOOTH_MESSAGES.errorWithDetails(BLUETOOTH_MESSAGES.connectionFailed)
    )
  })

  it('closes a half-open link when the page unmounts mid-handshake', async () => {
    mockGatt.connect.mockImplementation(() => {
      mockGatt.connected = true
      return Promise.resolve(mockGatt)
    })
    mockGatt.getPrimaryService.mockReturnValue(new Promise(() => {}))
    const { result, unmount } = renderHook(() => useBluetoothHRM())
    act(() => {
      void result.current.connectAndStream('Ari', 30).catch(() => {})
    })
    await waitFor(() => expect(mockGatt.getPrimaryService).toHaveBeenCalled())

    unmount()
    expect(mockGatt.disconnect).toHaveBeenCalled()
  })

  it('Reset forgets the strap and Connect opens the chooser in the same tab', async () => {
    const otherDevice = { ...mockDevice, id: 'other', forget: jest.fn() }
    mockBluetooth.getDevices.mockResolvedValue([mockDevice, otherDevice])
    const { result } = renderHook(() => useBluetoothHRM())
    await act(async () => {
      await result.current.connectAndStream('Ari', 30)
    })
    expect(result.current.isConnected).toBe(true)

    await act(async () => {
      await result.current.forgetDevice()
    })
    expect(mockDevice.forget).toHaveBeenCalledTimes(1)
    expect(otherDevice.forget).not.toHaveBeenCalled()
    expect(Cookies.remove).toHaveBeenCalledWith('hrm_device_id')
    expect(result.current.deviceStatus).toBe(BLUETOOTH_MESSAGES.deviceForgotten)

    mockBluetooth.requestDevice.mockClear()
    await act(async () => {
      await expect(result.current.connectAndStream('Ari', 30)).resolves.toBe(
        true
      )
    })
    expect(mockBluetooth.requestDevice).toHaveBeenCalledTimes(1)
    expect(result.current.isConnected).toBe(true)
  })

  it('Reset forgets a strap picked in the chooser whose first connect failed', async () => {
    mockGatt.connect.mockRejectedValueOnce(new Error('boom'))
    const { result } = renderHook(() => useBluetoothHRM())
    await act(async () => {
      await result.current.connectAndStream('Ari', 30).catch(() => {})
    })
    expect(result.current.isConnected).toBe(false)

    await act(async () => {
      await result.current.forgetDevice()
    })
    expect(mockDevice.forget).toHaveBeenCalledTimes(1)
  })

  it('Reset during a hung attempt frees Connect without a reload', async () => {
    mockGatt.connect
      .mockReturnValueOnce(new Promise(() => {}))
      .mockResolvedValue(mockGatt)
    const { result } = renderHook(() => useBluetoothHRM())

    let first: Promise<boolean> | undefined
    act(() => {
      first = result.current.connectAndStream('Ari', 30)
    })
    const firstSettled = first!.catch((error: unknown) => error)
    await waitFor(() => expect(mockGatt.connect).toHaveBeenCalledTimes(1))

    await act(async () => {
      await result.current.forgetDevice()
    })
    expect(await firstSettled).toMatchObject({ name: 'AbortError' })
    expect(result.current.deviceStatus).toBe(BLUETOOTH_MESSAGES.deviceForgotten)

    await act(async () => {
      await expect(result.current.connectAndStream('Ari', 30)).resolves.toBe(
        true
      )
    })
    expect(mockGatt.connect).toHaveBeenCalledTimes(2)
  })

  it('auto-resets a stuck connect once, then names the failure and offers the reload fallback', async () => {
    // Service discovery that never answers: the attempt holds the radio
    // with no progress, which only the detector can clear.
    mockGatt.getPrimaryService.mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => useBluetoothHRM())

    act(() => {
      void result.current.connectAndStream('Ari', 30).catch(() => {})
    })
    await act(async () => {
      await jest.advanceTimersByTimeAsync(
        STUCK_CONNECT_TIMEOUT_MS + STUCK_CHECK_INTERVAL_MS
      )
    })
    expect(loggedMessages('warn')).toContain('stuck connect, auto-resetting')
    await act(async () => {
      await jest.advanceTimersByTimeAsync(5000)
    })
    // Episode 1: reset, then one automatic retry.
    expect(mockGatt.connect).toHaveBeenCalledTimes(2)
    expect(result.current.showReloadFallback).toBe(false)

    await act(async () => {
      await jest.advanceTimersByTimeAsync(
        STUCK_CONNECT_TIMEOUT_MS + STUCK_CHECK_INTERVAL_MS + 5000
      )
    })
    expect(
      loggedMessages('warn').filter(
        (m) => m === 'stuck connect, auto-resetting'
      )
    ).toHaveLength(2)
    expect(mockGatt.connect).toHaveBeenCalledTimes(2)
    expect(result.current.deviceStatus).toBe(
      BLUETOOTH_MESSAGES.errorWithDetails(BLUETOOTH_MESSAGES.connectStuck)
    )
    expect(result.current.showReloadFallback).toBe(true)
  })

  it('never treats the open-ended wait for the strap as stuck', async () => {
    ;(Cookies.get as jest.Mock).mockReturnValue('hr6')
    mockGatt.connect.mockRejectedValue(new Error('Connection failed'))
    const { result } = renderHook(() => useBluetoothHRM())
    await act(async () => {
      await result.current.autoConnect()
    })
    expect(result.current.deviceStatus).toBe(
      BLUETOOTH_MESSAGES.waitingForDevice('HR6 0050855')
    )

    // A wake attempt that hangs inside the wait.
    mockGatt.connect.mockReset()
    mockGatt.connect.mockResolvedValue(mockGatt)
    mockGatt.getPrimaryService.mockReturnValue(new Promise(() => {}))
    await act(async () => {
      await jest.advanceTimersByTimeAsync(60000 + STUCK_CONNECT_TIMEOUT_MS * 2)
    })
    // The 60s poll's wake attempt is the one hanging in service discovery.
    expect(mockGatt.connect).toHaveBeenCalled()
    expect(mockGatt.getPrimaryService).toHaveBeenCalled()
    expect(loggedMessages('warn')).not.toContain(
      'stuck connect, auto-resetting'
    )
  })

  it('offers the reload fallback only after repeated failed connects, not chooser cancels', async () => {
    const { result } = renderHook(() => useBluetoothHRM())
    mockBluetooth.requestDevice.mockRejectedValue(
      new DOMException('User cancelled', 'NotFoundError')
    )
    for (let i = 0; i < 3; i++) {
      await act(async () => {
        await result.current.connectAndStream('Ari', 30).catch(() => {})
      })
    }
    expect(result.current.showReloadFallback).toBe(false)

    mockBluetooth.requestDevice.mockResolvedValue(mockDevice)
    mockGatt.connect.mockRejectedValue(new Error('boom'))
    await act(async () => {
      await result.current.connectAndStream('Ari', 30).catch(() => {})
    })
    expect(result.current.showReloadFallback).toBe(false)
    await act(async () => {
      await result.current.connectAndStream('Ari', 30).catch(() => {})
    })
    expect(result.current.showReloadFallback).toBe(true)
  })
})
