/**
 * @jest-environment jsdom
 */

import { useHrmWatchdog } from '@/hooks/useBluetoothHRM/useHrmWatchdog'
import { BluetoothConnectionStatus } from '@/types/bluetooth'
import { HEARTBEAT_INTERVAL_MS } from '@/hooks/useBluetoothHRM/constants'
import { BLUETOOTH_MESSAGES } from '@/constants/bluetooth-messages'
import { renderHook, act } from '@testing-library/react'

const setup = ({
  status = BluetoothConnectionStatus.CONNECTED,
  isConnecting = false,
  dataLivenessTimeoutMs = 30_000,
  checkSignalStability = jest.fn(),
}: {
  status?: BluetoothConnectionStatus
  isConnecting?: boolean
  dataLivenessTimeoutMs?: number
  checkSignalStability?: jest.Mock
} = {}) => {
  const connectedDeviceRef = {
    current: {
      gatt: { disconnect: jest.fn() },
    } as unknown as BluetoothDevice,
  }
  const lastDataTime = { current: 0 as number }
  const isConnectingRef = { current: isConnecting }
  const isTimeoutDisconnect = { current: false }
  const setStatus = jest.fn()
  const setCustomStatusMessage = jest.fn()

  const renderHookResult = renderHook(() =>
    useHrmWatchdog({
      currentStatusRef: { current: status },
      lastDataTime,
      connectedDeviceRef,
      isConnecting: isConnectingRef,
      isTimeoutDisconnect,
      setStatus: setStatus as never,
      setCustomStatusMessage: setCustomStatusMessage as never,
      checkSignalStability,
      dataLivenessTimeoutMs,
      heartbeatInterval: HEARTBEAT_INTERVAL_MS,
    })
  )

  return {
    unmount: () => renderHookResult.unmount(),
    lastDataTime,
    connectedDeviceRef,
    isConnectingRef,
    isTimeoutDisconnect,
    setStatus,
    setCustomStatusMessage,
    checkSignalStability,
  }
}

describe('useHrmWatchdog', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(10_000_000)
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('probes signal stability on every tick', () => {
    const { checkSignalStability } = setup()

    act(() => jest.advanceTimersByTime(HEARTBEAT_INTERVAL_MS))
    expect(checkSignalStability).toHaveBeenCalledTimes(1)
    act(() => jest.advanceTimersByTime(HEARTBEAT_INTERVAL_MS))
    expect(checkSignalStability).toHaveBeenCalledTimes(2)
  })

  it('force-cycles a link gone quiet past the liveness timeout', () => {
    const {
      lastDataTime,
      connectedDeviceRef,
      isTimeoutDisconnect,
      setStatus,
      setCustomStatusMessage,
    } = setup()
    lastDataTime.current = Date.now() - 31_000

    // Liveness is probed on every other tick.
    act(() => jest.advanceTimersByTime(HEARTBEAT_INTERVAL_MS * 2))

    expect(setStatus).toHaveBeenCalledWith(
      BluetoothConnectionStatus.RECONNECTING
    )
    expect(setCustomStatusMessage).toHaveBeenCalledWith(
      BLUETOOTH_MESSAGES.unstableConnection
    )
    expect(isTimeoutDisconnect.current).toBe(true)
    expect(connectedDeviceRef.current.gatt.disconnect).toHaveBeenCalled()
  })

  it('does nothing while packets keep arriving', () => {
    const { lastDataTime, connectedDeviceRef, setStatus } = setup()
    lastDataTime.current = Date.now() - 1_000

    act(() => jest.advanceTimersByTime(HEARTBEAT_INTERVAL_MS * 4))

    expect(setStatus).not.toHaveBeenCalled()
    expect(connectedDeviceRef.current.gatt.disconnect).not.toHaveBeenCalled()
  })

  it('skips the forced disconnect while a connection is in progress', () => {
    const { lastDataTime, connectedDeviceRef, setStatus, isTimeoutDisconnect } =
      setup({ isConnecting: true })
    lastDataTime.current = Date.now() - 31_000

    act(() => jest.advanceTimersByTime(HEARTBEAT_INTERVAL_MS * 2))

    expect(setStatus).not.toHaveBeenCalled()
    expect(connectedDeviceRef.current.gatt.disconnect).not.toHaveBeenCalled()
    expect(isTimeoutDisconnect.current).toBe(false)
  })

  it('does nothing while not connected', () => {
    const { lastDataTime, setStatus } = setup({
      status: BluetoothConnectionStatus.DISCONNECTED,
    })
    lastDataTime.current = Date.now() - 31_000

    act(() => jest.advanceTimersByTime(HEARTBEAT_INTERVAL_MS * 4))

    expect(setStatus).not.toHaveBeenCalled()
  })

  it('skips liveness probing entirely when the timeout is disabled', () => {
    const { lastDataTime, connectedDeviceRef, setStatus } = setup({
      dataLivenessTimeoutMs: 0,
    })
    lastDataTime.current = Date.now() - 60_000

    act(() => jest.advanceTimersByTime(HEARTBEAT_INTERVAL_MS * 4))

    expect(setStatus).not.toHaveBeenCalled()
    expect(connectedDeviceRef.current.gatt.disconnect).not.toHaveBeenCalled()
  })

  it('stops probing after unmount', () => {
    const checkSignalStability = jest.fn()
    const { unmount } = setup({ checkSignalStability })

    act(() => jest.advanceTimersByTime(HEARTBEAT_INTERVAL_MS))
    const callsBefore = checkSignalStability.mock.calls.length
    expect(callsBefore).toBeGreaterThan(0)

    unmount()
    act(() => jest.advanceTimersByTime(HEARTBEAT_INTERVAL_MS * 3))

    expect(checkSignalStability.mock.calls.length).toBe(callsBefore)
  })
})
