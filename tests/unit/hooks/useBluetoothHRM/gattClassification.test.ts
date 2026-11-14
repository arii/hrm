import {
  applyGattFailure,
  classifyGattConnectError,
  classifyGattFailure,
  getAutoConnectFailureMessage,
  isBusyRadioError,
  isQuietStrapMiss,
  type GattConnectRetryState,
} from '@/hooks/useBluetoothHRM/gattClassification'
import { BluetoothConnectionStatus } from '@/types/bluetooth'
import { BLUETOOTH_MESSAGES } from '@/constants/bluetooth-messages'

const baseRetryState: GattConnectRetryState = {
  linkUp: false,
  aborted: false,
  attempt: 1,
  busyRetriesUsed: 0,
  quietRetriesUsed: 0,
  retryQuietStrap: true,
  manualDisconnect: false,
  unmounted: false,
  ownershipCurrent: true,
}

const makeDevice = (name = 'Strap'): BluetoothDevice =>
  ({
    name,
    gatt: { disconnect: jest.fn() },
  }) as unknown as BluetoothDevice

describe('busy/quiet radio classifiers', () => {
  it('treats a busy radio as retryable', () => {
    expect(isBusyRadioError('BLE error: busy')).toBe(true)
    expect(isBusyRadioError('NetworkError')).toBe(true)
  })

  it('excludes instant misses from the busy schedule', () => {
    expect(isBusyRadioError('Device no longer in range')).toBe(false)
  })

  it('recognizes quiet-strap misses', () => {
    expect(isQuietStrapMiss('Device no longer in range')).toBe(true)
    expect(isQuietStrapMiss('device not found')).toBe(true)
    expect(isQuietStrapMiss('some other failure')).toBe(false)
  })
})

describe('classifyGattFailure', () => {
  it('classifies a timeout first, regardless of abort state', () => {
    expect(classifyGattFailure(new Error('connection timeout'), true)).toBe(
      'timeout'
    )
  })

  it('classifies a dropped GATT link as disconnected-during-connect', () => {
    expect(
      classifyGattFailure(
        new Error('GATT Server is disconnected. You cannot do this.'),
        false
      )
    ).toBe('disconnected-during-connect')
  })

  it('classifies a deliberate abort', () => {
    const abort = new DOMException('The user aborted', 'AbortError')
    expect(classifyGattFailure(abort, true)).toBe('intentional-abort')
  })

  it('does not classify an abort as deliberate when the signal is live', () => {
    const abort = new DOMException('The user aborted', 'AbortError')
    expect(classifyGattFailure(abort, false)).toBe('failed')
  })

  it('classifies anything else as failed', () => {
    expect(classifyGattFailure(new Error('boom'), false)).toBe('failed')
  })
})

describe('classifyGattConnectError', () => {
  it('adopts a live link without spending a retry', () => {
    const action = classifyGattConnectError('busy', {
      ...baseRetryState,
      linkUp: true,
    })
    expect(action).toEqual({ kind: 'adopt-live-link' })
  })

  it('schedules an escalating busy retry while the schedule has entries', () => {
    const action = classifyGattConnectError('busy', baseRetryState)
    expect(action).toEqual({
      kind: 'busy-retry',
      delayMs: 1000,
      retryNumber: 1,
    })

    const later = classifyGattConnectError('NetworkError', {
      ...baseRetryState,
      busyRetriesUsed: 2,
    })
    expect(later).toEqual({ kind: 'busy-retry', delayMs: 5000, retryNumber: 3 })
  })

  it('fails once the busy schedule is exhausted', () => {
    const action = classifyGattConnectError('busy', {
      ...baseRetryState,
      busyRetriesUsed: 3,
    })
    expect(action.kind).toBe('fail')
  })

  it('schedules a quiet-strap retry for an instant miss on a fresh connect', () => {
    const action = classifyGattConnectError('Device no longer in range', {
      ...baseRetryState,
    })
    expect(action).toEqual({
      kind: 'quiet-retry',
      delayMs: 5000,
      retryNumber: 1,
    })
  })

  it('does not quiet-retry without a fresh-connect attempt', () => {
    const action = classifyGattConnectError('Device no longer in range', {
      ...baseRetryState,
      retryQuietStrap: false,
    })
    expect(action.kind).toBe('fail')
  })

  it('does not quiet-retry after a manual disconnect or unmount', () => {
    for (const override of [
      { manualDisconnect: true },
      { unmounted: true },
      { ownershipCurrent: false },
    ]) {
      const action = classifyGattConnectError('Device no longer in range', {
        ...baseRetryState,
        ...override,
      })
      expect(action.kind).toBe('fail')
    }
  })
})

describe('applyGattFailure', () => {
  const setup = (kind: 'timeout' | 'dropped' | 'failed', aborted = false) => {
    const device = makeDevice()
    const connectedDeviceRef = { current: device }
    const reconnectHaltedRef = { current: false }
    const setStatus = jest.fn()
    const setCustomStatusMessage = jest.fn()
    const error =
      kind === 'timeout'
        ? new Error('connection timeout')
        : kind === 'dropped'
          ? new Error('GATT operation failed for unknown reason.')
          : new Error('boom')

    const result = applyGattFailure({
      device,
      error,
      aborted,
      connectedDeviceRef,
      reconnectHaltedRef,
      setStatus: setStatus as never,
      setCustomStatusMessage: setCustomStatusMessage as never,
    })
    return {
      result,
      device,
      connectedDeviceRef,
      reconnectHaltedRef,
      setStatus,
      setCustomStatusMessage,
    }
  }

  it('returns the error untouched in every class', () => {
    expect(setup('timeout').result.message).toBe('connection timeout')
    expect(setup('dropped').result).toBeInstanceOf(Error)
    expect(setup('failed').result).toBeInstanceOf(Error)
  })

  it('severs a half-open GATT link before anything else', () => {
    const { device } = setup('failed')
    expect(device.gatt!.disconnect).toHaveBeenCalled()
  })

  it('on timeout: halts reconnects, keeps the saved device, and names the timeout', () => {
    const {
      connectedDeviceRef,
      reconnectHaltedRef,
      setStatus,
      setCustomStatusMessage,
    } = setup('timeout')
    expect(reconnectHaltedRef.current).toBe(true)
    expect(connectedDeviceRef.current).toBeNull()
    expect(setStatus).toHaveBeenCalledWith(BluetoothConnectionStatus.ERROR)
    expect(setCustomStatusMessage).toHaveBeenCalledWith(
      BLUETOOTH_MESSAGES.connectionTimeout
    )
  })

  it('on a dropped link: keeps the device slot but does not halt reconnects', () => {
    const { connectedDeviceRef, reconnectHaltedRef, setCustomStatusMessage } =
      setup('dropped')
    expect(connectedDeviceRef.current).toBeNull()
    expect(reconnectHaltedRef.current).toBe(false)
    expect(setCustomStatusMessage).not.toHaveBeenCalled()
  })

  it('on failure: forgets the device without halting reconnects', () => {
    const { connectedDeviceRef, reconnectHaltedRef } = setup('failed')
    expect(connectedDeviceRef.current).toBeNull()
    expect(reconnectHaltedRef.current).toBe(false)
  })

  it('on an intentional abort: keeps the device slot and writes no state', () => {
    const device = makeDevice()
    const connectedDeviceRef = { current: device as BluetoothDevice | null }
    const reconnectHaltedRef = { current: false }
    const setStatus = jest.fn()
    const setCustomStatusMessage = jest.fn()
    const abort = new DOMException('The user aborted a request.', 'AbortError')

    const result = applyGattFailure({
      device,
      error: abort,
      aborted: true,
      connectedDeviceRef,
      reconnectHaltedRef,
      setStatus: setStatus as never,
      setCustomStatusMessage: setCustomStatusMessage as never,
    })

    expect(result).toBe(abort)
    // Deliberate aborts are user intent, not link failure: the device slot
    // and reconnect budget are untouched and no UI state is written.
    expect(connectedDeviceRef.current).toBe(device)
    expect(reconnectHaltedRef.current).toBe(false)
    expect(setStatus).not.toHaveBeenCalled()
    expect(setCustomStatusMessage).not.toHaveBeenCalled()
  })
})

describe('getAutoConnectFailureMessage', () => {
  it('stays silent when there was no saved device', () => {
    expect(
      getAutoConnectFailureMessage(
        new Error('No saved device ID for silent connection.')
      )
    ).toBeNull()
  })

  it('stays silent on a deliberate abort', () => {
    expect(
      getAutoConnectFailureMessage(new DOMException('aborted', 'AbortError'))
    ).toBeNull()
  })

  it('maps a NetworkError DOMException to the connection-failed banner', () => {
    expect(
      getAutoConnectFailureMessage(new DOMException('network', 'NetworkError'))
    ).toBe(BLUETOOTH_MESSAGES.connectionFailed)
  })

  it('maps a quiet-strap miss to the connection-failed banner', () => {
    expect(
      getAutoConnectFailureMessage(new Error('Device no longer in range'))
    ).toBe(BLUETOOTH_MESSAGES.connectionFailed)
  })

  it('maps a generic NetworkError message to the generic auto-connect banner', () => {
    // Only a DOMException named NetworkError (or a quiet-strap miss) gets
    // the connection-failed banner; a plain Error with that message does not.
    expect(getAutoConnectFailureMessage(new Error('NetworkError'))).toBe(
      BLUETOOTH_MESSAGES.autoConnectFailed
    )
  })

  it('maps a timeout to the connection-timeout banner', () => {
    expect(getAutoConnectFailureMessage(new Error('connect timeout'))).toBe(
      BLUETOOTH_MESSAGES.connectionTimeout
    )
  })

  it('falls back to the generic auto-connect banner', () => {
    expect(getAutoConnectFailureMessage(new Error('boom'))).toBe(
      BLUETOOTH_MESSAGES.autoConnectFailed
    )
  })
})
