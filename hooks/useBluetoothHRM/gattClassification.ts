import { BLUETOOTH_MESSAGES } from '@/constants/bluetooth-messages'
import {
  BUSY_RETRY_DELAYS_MS,
  QUIET_STRAP_RETRY_DELAYS_MS,
} from '@/constants/bluetooth-reconnection'
import { BluetoothConnectionStatus } from '@/types/bluetooth'
import logger from '@/utils/logger'
import type { Dispatch, MutableRefObject, SetStateAction } from 'react'

/**
 * Maps a silent auto-connect failure to the banner message, or null to stay
 * silent (no saved device yet, or a superseded attempt). Mirrors the manual
 * path's NetworkError mapping so both surfaces name the cause.
 */
export const getAutoConnectFailureMessage = (error: unknown): string | null => {
  const errorMsg = error instanceof Error ? error.message : String(error)
  if (errorMsg.includes('No saved device ID')) return null
  if (error instanceof DOMException && error.name === 'AbortError') return null
  if (
    (error instanceof DOMException && error.name === 'NetworkError') ||
    isQuietStrapMiss(errorMsg)
  ) {
    return BLUETOOTH_MESSAGES.connectionFailed
  }
  if (/timeout/i.test(errorMsg)) return BLUETOOTH_MESSAGES.connectionTimeout
  return BLUETOOTH_MESSAGES.autoConnectFailed
}

/**
 * Busy-radio classifier for the GATT connect retry loop: a radio that is
 * mid-operation (or a generic link NetworkError) is worth a fast retry.
 * Instant misses ("no longer in range") are excluded — hammering
 * gatt.connect() cannot summon an absent device and risks wedging the
 * adapter. Pure: unit-tested.
 */
export const isBusyRadioError = (errorText: string): boolean =>
  !errorText.includes('no longer in range') &&
  (errorText.includes('busy') || errorText.includes('NetworkError'))

/**
 * Quiet-strap classifier: the first radio op often fails fast while the
 * adapter/strap wakes. These misses qualify for the staggered quiet-strap
 * schedule; timeouts (a full radio engagement already consumed) do not.
 * Pure: unit-tested.
 */
export const isQuietStrapMiss = (errorText: string): boolean =>
  /no longer in range|device not found/i.test(errorText)

/**
 * Terminal classification of a failed GATT connection attempt. Timeout is
 * checked first, mirroring the original branch order: abort errors never
 * carry 'timeout' in their message (see cancellablePromise), so the order
 * agrees on every producible error. Pure: unit-tested.
 */
type GattFailureKind =
  | 'timeout'
  | 'disconnected-during-connect'
  | 'intentional-abort'
  | 'failed'

export const classifyGattFailure = (
  error: unknown,
  signalAborted: boolean
): GattFailureKind => {
  const errorMsg = error instanceof Error ? error.message : String(error)
  const errorName = error instanceof DOMException ? error.name : 'Error'
  if (errorMsg.includes('timeout')) return 'timeout'
  if (
    errorMsg.includes('GATT Server is disconnected') ||
    errorMsg.includes('GATT operation failed')
  ) {
    return 'disconnected-during-connect'
  }
  if (errorName === 'AbortError' && signalAborted) return 'intentional-abort'
  return 'failed'
}

/**
 * What the GATT connect loop should do about one failed radio attempt.
 * Pure policy: the loop still owns the sleeps, the UI writes, and the
 * post-sleep re-checks. Unit-tested.
 */
type GattConnectRetryAction =
  | { kind: 'adopt-live-link' }
  | { kind: 'busy-retry'; delayMs: number; retryNumber: number }
  | { kind: 'quiet-retry'; delayMs: number; retryNumber: number }
  | { kind: 'fail' }

/** Loop and hook state the retry policy reads. All plain values. */
export interface GattConnectRetryState {
  linkUp: boolean
  aborted: boolean
  attempt: number
  busyRetriesUsed: number
  quietRetriesUsed: number
  retryQuietStrap: boolean
  manualDisconnect: boolean
  unmounted: boolean
  ownershipCurrent: boolean
}

export const classifyGattConnectError = (
  errorText: string,
  state: GattConnectRetryState
): GattConnectRetryAction => {
  // Adopt live links: the radio can report failure while the OS link is
  // already up — our 20s timer firing on a slow strap, or BlueZ raising
  // an instant miss mid-negotiation. Adopting device.gatt directly costs
  // zero new radio ops and cannot collide with the still-pending original
  // connect() (a second connect() call could throw "already in progress").
  if (state.linkUp && !state.aborted) return { kind: 'adopt-live-link' }
  // Retry only a busy radio on an escalating schedule. "No longer in
  // range" skips this path: instant misses get the quiet-strap schedule
  // below, since hammering gatt.connect() cannot summon an absent device
  // and the extra radio ops risk wedging the adapter (self-inflicted
  // busy). Escalation (not a fixed fast delay) gives a genuinely wedged
  // daemon time to settle instead of re-colliding with it.
  const busyDelay = BUSY_RETRY_DELAYS_MS[state.busyRetriesUsed]
  if (isBusyRadioError(errorText) && busyDelay !== undefined) {
    return {
      kind: 'busy-retry',
      delayMs: busyDelay,
      retryNumber: state.busyRetriesUsed + 1,
    }
  }
  return quietRetryOrFail(errorText, state)
}

/**
 * Quiet-strap schedule check: the first radio op often fails fast while
 * the adapter/strap wakes; retry a few times over ~35s. Only instant
 * misses qualify: a 20s timeout already consumed a full radio engagement
 * (and slow-link wins are adopted above), so re-hammering a timing-out
 * radio would risk the adapter wedging #9303 warned about. Covered
 * through classifyGattConnectError's tests.
 */
const quietRetryOrFail = (
  errorText: string,
  state: GattConnectRetryState
): GattConnectRetryAction => {
  const quietDelay = QUIET_STRAP_RETRY_DELAYS_MS[state.quietRetriesUsed]
  if (!state.retryQuietStrap) return { kind: 'fail' }
  if (quietDelay === undefined) return { kind: 'fail' }
  if (!isQuietStrapMiss(errorText)) return { kind: 'fail' }
  if (state.manualDisconnect || state.unmounted) return { kind: 'fail' }
  if (!state.ownershipCurrent) return { kind: 'fail' }
  return {
    kind: 'quiet-retry',
    delayMs: quietDelay,
    retryNumber: state.quietRetriesUsed + 1,
  }
}

/** Refs and setters applyGattFailure writes through; all stable. */
interface GattFailureOutcomeParams {
  device: BluetoothDevice
  error: unknown
  aborted: boolean
  connectedDeviceRef: MutableRefObject<BluetoothDevice | null>
  reconnectHaltedRef: MutableRefObject<boolean>
  setStatus: Dispatch<SetStateAction<BluetoothConnectionStatus>>
  setCustomStatusMessage: Dispatch<SetStateAction<string | null>>
}

/**
 * State consequences of each GATT failure class, extracted verbatim from
 * connectToGatt's catch block. Severing the half-open link, logging, the
 * banner message, and the halt-vs-forget decision all follow from the
 * classification above; refs and setters are the only state it touches.
 */
export const applyGattFailure = ({
  device,
  error,
  aborted,
  connectedDeviceRef,
  reconnectHaltedRef,
  setStatus,
  setCustomStatusMessage,
}: GattFailureOutcomeParams): unknown => {
  // Zombie killer (#9154): sever any half-open GATT link so the next
  // attempt meets a free radio instead of tripping over our own
  // previous session. Safe when already down; never masks the error.
  try {
    device.gatt?.disconnect()
  } catch {
    // Link was already down - nothing to sever.
  }
  const errorMsg = error instanceof Error ? error.message : String(error)
  const errorName = error instanceof DOMException ? error.name : 'Error'
  const kind = classifyGattFailure(error, aborted)

  if (kind !== 'intentional-abort') {
    logger.error(
      { errorName, errorMsg, device: device.name },
      'GATT Connection failed'
    )
  }

  if (kind === 'timeout') {
    // Timeout is NOT revoked permissions: the strap was likely asleep
    // or the adapter slow. Keep the saved device and cookie so a
    // one-touch retry works; only explicit denial (NotFoundError /
    // SecurityError) touches permissions. Previously this branch
    // wiped the cookie and blamed revoked permissions, forcing a
    // full re-pair for a strap that was just slow.
    logger.warn(
      { device: device.name },
      'GATT connection timed out; keeping saved device for retry.'
    )
    setStatus(BluetoothConnectionStatus.ERROR)
    setCustomStatusMessage(BLUETOOTH_MESSAGES.connectionTimeout)
    // Halt the auto-reconnect loop without spending the attempts
    // budget: reconnect() consumes this and stops, keeping the saved
    // device (attempts exhaustion would forget it).
    reconnectHaltedRef.current = true
    connectedDeviceRef.current = null
  } else if (kind === 'disconnected-during-connect') {
    logger.warn(
      { device: device.name },
      'Device disconnected during connection. Will attempt auto-reconnect.'
    )
    connectedDeviceRef.current = null
  } else if (kind === 'failed') {
    connectedDeviceRef.current = null
  }

  return error
}
