import {
  useCallback,
  useState,
  useRef,
  useEffect,
  type Dispatch,
  type SetStateAction,
} from 'react'
import { BluetoothConnectionStatus } from '@/types/bluetooth'
import logger from '@/utils/logger'
import { useWebSocketConnection } from '@/context/WebSocketContext'
import { useHrmMetadataSync } from '@/hooks/useHrmMetadataSync'
import { clientEnv } from '@/lib/env-client'
import { cancellablePromise } from '@/utils/promise'
import Cookies from 'js-cookie'
import { BLUETOOTH_MESSAGES } from '@/constants/bluetooth-messages'
import {
  BLUETOOTH_MAX_RECONNECT_ATTEMPTS,
  getBackoffDelay,
  BUSY_RETRY_DELAYS_MS,
  QUIET_STRAP_RETRY_DELAYS_MS,
  ADVERTISEMENT_FALLBACK_POLL_MS,
  WAKE_ATTEMPT_COOLDOWN_MS,
  WAIT_GUIDANCE_AFTER_MISSES,
} from '@/constants/bluetooth-reconnection'
import {
  STABILITY_THRESHOLD_MS,
  MISSED_PACKET_THRESHOLD_BUFFER_MS,
  MIN_MISSED_PACKET_THRESHOLD_MS,
  ROLLING_AVG_HISTORY_LENGTH,
  DATA_LIVENESS_TIMEOUT_MS,
} from '@/constants/bluetooth'

const HR_SERVICE_UUID = 'heart_rate'
const HR_CHARACTERISTIC_UUID = 'heart_rate_measurement'
const BATTERY_SERVICE_UUID = 'battery_service'
const BATTERY_LEVEL_CHARACTERISTIC_UUID = 'battery_level'

export const HEARTBEAT_INTERVAL_MS = 1000

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

const statusMessageMap: Record<BluetoothConnectionStatus, string> = {
  [BluetoothConnectionStatus.DISCONNECTED]: BLUETOOTH_MESSAGES.disconnected,
  [BluetoothConnectionStatus.CONNECTING]: BLUETOOTH_MESSAGES.connecting,
  [BluetoothConnectionStatus.CONNECTED]: BLUETOOTH_MESSAGES.connected,
  [BluetoothConnectionStatus.RECONNECTING]: BLUETOOTH_MESSAGES.reconnecting,
  [BluetoothConnectionStatus.ERROR]: BLUETOOTH_MESSAGES.error,
}

/**
 * Best-effort battery subscription (#9596). The battery service is optional
 * on HR straps: any failure resolves silently and the dashboard simply
 * shows no battery level.
 */
export const setupBatteryNotifications = async (
  server: BluetoothRemoteGATTServer,
  onBatteryLevel: (level: number) => void
): Promise<void> => {
  try {
    const batteryService = await server.getPrimaryService(BATTERY_SERVICE_UUID)
    const batteryChar = await batteryService.getCharacteristic(
      BATTERY_LEVEL_CHARACTERISTIC_UUID
    )
    const value = await batteryChar.readValue()
    onBatteryLevel(value.getUint8(0))
    await batteryChar.startNotifications()
    batteryChar.addEventListener('characteristicvaluechanged', (e: unknown) => {
      const event = e as Event
      const target = event.target as BluetoothRemoteGATTCharacteristic
      onBatteryLevel(target.value!.getUint8(0))
    })
  } catch {
    /* Battery service optional */
  }
}

const parseHeartRate = (value: DataView): number => {
  const flags = value.getUint8(0)
  const is16Bit = flags & 0x1
  return is16Bit ? value.getUint16(1, true) : value.getUint8(1)
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

/** The VRT/test control slots this hook installs on window. */
export interface HrmTestControls {
  setHrmStatus: Dispatch<SetStateAction<BluetoothConnectionStatus>>
  setCustomHrmStatusMessage: Dispatch<SetStateAction<string | null>>
  setSignalStatus: Dispatch<SetStateAction<{ last: number; slow: number }>>
}

/**
 * Removes this hook instance's VRT/test controls, but only when the slots
 * still hold these exact functions: a remounted hook overwrites them with
 * its own wrappers, which a stale unmount must not delete. The identities
 * to match arrive as arguments (the installed wrappers, not the raw
 * setters) so the comparison can actually succeed.
 */
export const teardownTestControls = (installed: HrmTestControls): void => {
  if (typeof window === 'undefined') return
  const controls = window.__TEST_CONTROLS__
  if (!controls) return
  if (controls.setHrmStatus === installed.setHrmStatus) {
    delete controls.setHrmStatus
  }
  if (
    controls.setCustomHrmStatusMessage === installed.setCustomHrmStatusMessage
  ) {
    delete controls.setCustomHrmStatusMessage
  }
  if (controls.setSignalStatus === installed.setSignalStatus) {
    delete controls.setSignalStatus
  }
}

/** Dependencies resolveConnectDevice needs from the hook. */
interface ConnectDeviceResolver {
  savedDevice: BluetoothDevice | null
  findSavedDevice: (silent: boolean) => Promise<BluetoothDevice | null>
  onScanning: () => void
}

/**
 * Device-resolution stage of connectAndStream: the already-known device,
 * else the saved-device lookup, else (manual only) the system picker.
 * Silent attempts never open the picker; picker cancellation propagates
 * to the caller. Extracted verbatim from connectAndStream's resolution
 * branch. Unit-tested.
 */
export const resolveConnectDevice = async (
  silent: boolean,
  resolver: ConnectDeviceResolver
): Promise<BluetoothDevice | null> => {
  if (resolver.savedDevice) return resolver.savedDevice
  const found = await resolver.findSavedDevice(silent)
  if (found) return found
  if (silent) return null
  resolver.onScanning()
  return navigator.bluetooth.requestDevice({
    filters: [{ services: [HR_SERVICE_UUID] }],
    optionalServices: [BATTERY_SERVICE_UUID],
  })
}

interface UseBluetoothHRMProps {
  dataLivenessTimeoutMs?: number
  throttleMs?: number
  userName?: string | null
  userAge?: number | null
  onHeartRateUpdate?: (heartRate: number) => void
  onConnect?: () => void
  heartbeatInterval?: number
}

const useBluetoothHRM = (props: UseBluetoothHRMProps = {}) => {
  const {
    dataLivenessTimeoutMs = DATA_LIVENESS_TIMEOUT_MS,
    userName,
    userAge,
    onHeartRateUpdate,
    onConnect,
    heartbeatInterval = HEARTBEAT_INTERVAL_MS,
  } = props
  const { sendData, connectionStatus } = useWebSocketConnection()
  const [status, setStatus] = useState<BluetoothConnectionStatus>(
    BluetoothConnectionStatus.DISCONNECTED
  )
  const [customStatusMessage, setCustomStatusMessage] = useState<string | null>(
    null
  )
  const [savedDevice, setSavedDevice] = useState<BluetoothDevice | null>(null)
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null)
  const [signalPeriodMs, setSignalPeriodMs] = useState(0)
  const [signalStatus, setSignalStatus] = useState({ last: 0, slow: 0 })
  const [connectionAttempted, setConnectionAttempted] = useState(false)
  // Monotonic ownership token for connection UI state. Every NEW operation
  // (manual connect, disconnect, reconnect, test injection) claims it via
  // claimConnectionAttempt; stale async completions (notably silent
  // auto-connect finishing after newer state) must check it before writing.
  const connectionAttemptRef = useRef(0)
  const claimConnectionAttempt = useCallback(() => {
    connectionAttemptRef.current += 1
  }, [])
  const [isSupported] = useState(
    () => typeof navigator !== 'undefined' && !!navigator.bluetooth
  )

  const deviceStatus = customStatusMessage ?? statusMessageMap[status]

  const currentStatusRef = useRef(status)
  const lastDataTime = useRef<number>(0)
  const lastWatchdogMark = useRef<number>(0)
  const connectedDeviceRef = useRef<BluetoothDevice | null>(null)
  const periodHistory = useRef<number[]>([])
  const avgPeriodMs = useRef<number>(0)
  const isManualDisconnect = useRef(false)
  const isTimeoutDisconnect = useRef(false)
  const reconnectAttempts = useRef(0)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  // Waiting-for-device state (issue 9806): armed when retries exhaust
  // with a known saved device instead of stopping/forgetting.
  const waitingDeviceRef = useRef<BluetoothDevice | null>(null)
  const waitingPollTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const waitingAdvertisementRef = useRef<{
    device: BluetoothDevice
    listener: () => void
  } | null>(null)
  const lastWakeAttemptAtRef = useRef(0)
  const waitMissesRef = useRef(0)
  const waitAdSeenRef = useRef(false)
  // Set when a GATT timeout stops the auto-reconnect loop: a timeout means
  // an asleep strap or slow adapter, not a dead link, so retries halt but
  // the saved device and cookie are kept for a one-touch retry (unlike
  // attempts exhaustion, which forgets the device). Consumed by
  // reconnect(); cleared on every fresh episode (see onDisconnected),
  // manual disconnect, and successful connect.
  const reconnectHaltedRef = useRef(false)
  const isConnecting = useRef(false)
  // Set once by the unmount cleanup below; quiet-retry sleeps check it so
  // a resolved timer never fires radio ops into an unmounted hook.
  const isUnmountedRef = useRef(false)
  const activeDisconnectListenerRef = useRef<((event: Event) => void) | null>(
    null
  )
  const activeHrSubscriptionRef = useRef<{
    characteristic: BluetoothRemoteGATTCharacteristic
    listener: (event: unknown) => void
  } | null>(null)

  const updateSignalPeriod = useCallback((newPeriod: number) => {
    periodHistory.current.push(newPeriod)
    if (periodHistory.current.length > ROLLING_AVG_HISTORY_LENGTH) {
      periodHistory.current.shift()
    }
    const total = periodHistory.current.reduce((sum, val) => sum + val, 0)
    const average = total / periodHistory.current.length
    avgPeriodMs.current = average
    setSignalPeriodMs(Math.round(average))
  }, [])

  /**
   * Signal half of the watchdog interval: folds over-threshold gaps into
   * the signal-period average and slow-packet counters. Extracted from the
   * interval tick; ref- and setter-only besides the period updater.
   */
  const checkSignalStability = useCallback(() => {
    if (
      currentStatusRef.current === BluetoothConnectionStatus.CONNECTED &&
      lastDataTime.current > 0
    ) {
      const now = Date.now()
      const timeSinceLastData = now - lastDataTime.current

      const threshold = Math.max(
        avgPeriodMs.current + MISSED_PACKET_THRESHOLD_BUFFER_MS,
        MIN_MISSED_PACKET_THRESHOLD_MS
      )

      if (timeSinceLastData > threshold) {
        updateSignalPeriod(timeSinceLastData)

        // Only increment slow count if we've crossed a new stability window
        // and haven't already marked this window.
        const currentStabilityWindows = Math.floor(
          timeSinceLastData / STABILITY_THRESHOLD_MS
        )
        const lastMarkedWindows = Math.floor(
          lastWatchdogMark.current / STABILITY_THRESHOLD_MS
        )

        if (currentStabilityWindows > lastMarkedWindows) {
          setSignalStatus((s) => ({
            last: timeSinceLastData,
            slow: s.slow + (currentStabilityWindows - lastMarkedWindows),
          }))
          lastWatchdogMark.current = timeSinceLastData
        } else {
          setSignalStatus((s) => ({ ...s, last: timeSinceLastData }))
        }
      }
    }
  }, [updateSignalPeriod])

  /**
   * Liveness half of the watchdog interval: force-cycles a link that has
   * gone quiet past the timeout. The timeout arrives as a parameter (prop
   * value), so this callback stays ref- and setter-only. Extracted from
   * the interval tick.
   */
  const checkDataLiveness = useCallback((livenessTimeoutMs: number) => {
    if (
      currentStatusRef.current === BluetoothConnectionStatus.CONNECTED &&
      lastDataTime.current > 0
    ) {
      const timeSinceLastData = Date.now() - lastDataTime.current

      if (timeSinceLastData > livenessTimeoutMs) {
        // Fix Race Condition: Don't force a disconnect/reconnect if we are already in a connection state transition
        if (isConnecting.current) {
          logger.warn(
            { timeSinceLastData },
            'Watchdog: Connection is in progress. Skipping forced disconnect.'
          )
          return
        }

        setStatus(BluetoothConnectionStatus.RECONNECTING)
        setCustomStatusMessage(BLUETOOTH_MESSAGES.unstableConnection)
        isTimeoutDisconnect.current = true
        if (connectedDeviceRef.current?.gatt)
          connectedDeviceRef.current.gatt.disconnect()
      }
    }
  }, [])

  const abortControllerRef = useRef<AbortController | null>(null)
  const connectToGattRef = useRef<
    | ((
        device: BluetoothDevice,
        isReconnect?: boolean,
        retryQuietStrap?: boolean
      ) => Promise<boolean>)
    | null
  >(null)
  const onHeartRateUpdateRef = useRef(onHeartRateUpdate)
  const onConnectRef = useRef(onConnect)

  useEffect(() => {
    onHeartRateUpdateRef.current = onHeartRateUpdate
  }, [onHeartRateUpdate])

  useEffect(() => {
    onConnectRef.current = onConnect
  }, [onConnect])

  const sendDataRef = useRef(sendData)
  useEffect(() => {
    sendDataRef.current = sendData
  }, [sendData])

  // Stable device-name reader for metadata sync (ref reads need no dep).
  const getDeviceName = useCallback(
    () => connectedDeviceRef.current?.name || 'Unknown',
    []
  )

  // User-details sync lives in its own hook; lifecycle + signal protocol stay
  // here (see useHrmMetadataSync for the decomposition rationale).
  const { userDetailsRef } = useHrmMetadataSync({
    userName,
    userAge,
    status,
    getDeviceName,
    sendData,
  })

  useEffect(() => {
    currentStatusRef.current = status
  }, [status])

  useEffect(() => {
    let checkCounter = 0
    const interval = setInterval(() => {
      // Every tick folds gaps into the signal stats; every other tick
      // also probes liveness (counter gating is scheduling, the checks
      // themselves live in the callbacks above).
      checkSignalStability()

      checkCounter++
      if (checkCounter % 2 === 0 && dataLivenessTimeoutMs > 0) {
        checkDataLiveness(dataLivenessTimeoutMs)
      }
    }, heartbeatInterval)

    return () => clearInterval(interval)
  }, [
    dataLivenessTimeoutMs,
    checkSignalStability,
    checkDataLiveness,
    heartbeatInterval,
  ])

  const stopWaitingForDevice = useCallback(() => {
    if (waitingPollTimeoutRef.current) {
      clearTimeout(waitingPollTimeoutRef.current)
      waitingPollTimeoutRef.current = null
    }
    const armed = waitingAdvertisementRef.current
    if (armed) {
      armed.device.removeEventListener('advertisementreceived', armed.listener)
      // DOM types declare unwatchAdvertisements, but platforms vary —
      // always feature-detect; absence is fine (poll-only mode).
      const unwatch = (
        armed.device as unknown as {
          unwatchAdvertisements?: () => void
        }
      ).unwatchAdvertisements
      if (typeof unwatch === 'function') {
        try {
          unwatch()
        } catch {
          // Already unwatched or torn down - nothing to release.
        }
      }
      waitingAdvertisementRef.current = null
    }
    waitingDeviceRef.current = null
  }, [])

  const disconnect = useCallback(() => {
    claimConnectionAttempt()
    isManualDisconnect.current = true
    isTimeoutDisconnect.current = false
    reconnectHaltedRef.current = false
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
    stopWaitingForDevice()
    if (connectedDeviceRef.current?.gatt?.connected)
      connectedDeviceRef.current.gatt.disconnect()

    sendDataRef.current({ type: 'HRM_INPUT', data: { value: null } })

    setStatus(BluetoothConnectionStatus.DISCONNECTED)
    setCustomStatusMessage(null)
    setSavedDevice(null)
    setBatteryLevel(null)
    setConnectionAttempted(false)
    connectedDeviceRef.current = null
    periodHistory.current = []
    avgPeriodMs.current = 0
    setSignalPeriodMs(0)
    setSignalStatus({ last: 0, slow: 0 })
  }, [claimConnectionAttempt, stopWaitingForDevice])

  const forgetDevice = useCallback(async () => {
    logger.info('Initiating device forget sequence...')
    disconnect()
    setConnectionAttempted(false)
    try {
      Cookies.remove('hrm_device_id')
      setStatus(BluetoothConnectionStatus.DISCONNECTED)
      setCustomStatusMessage(BLUETOOTH_MESSAGES.devicePermissionsRevoked)
    } catch (e) {
      logger.warn({ error: e }, 'Error during device forget')
      setStatus(BluetoothConnectionStatus.ERROR)
      setCustomStatusMessage(BLUETOOTH_MESSAGES.errorClearingPermissions)
    }
  }, [disconnect])

  const startWaitingForDevice = useCallback(
    (device: BluetoothDevice) => {
      if (waitingDeviceRef.current === device) return
      stopWaitingForDevice()
      waitingDeviceRef.current = device
      waitMissesRef.current = 0
      waitAdSeenRef.current = false
      reconnectAttempts.current = 0
      reconnectHaltedRef.current = false
      setStatus(BluetoothConnectionStatus.RECONNECTING)
      setCustomStatusMessage(
        BLUETOOTH_MESSAGES.waitingForDevice(device.name || '')
      )

      // Sustained misses escalate the message from patience to guidance:
      // advertisements seen but connects refused means the strap is held
      // elsewhere; silence means re-selecting may be needed. Recovery
      // keeps running underneath either way.
      const waitingMessage = () =>
        waitMissesRef.current >= WAIT_GUIDANCE_AFTER_MISSES
          ? waitAdSeenRef.current
            ? BLUETOOTH_MESSAGES.deviceHeldElsewhere(device.name || '')
            : BLUETOOTH_MESSAGES.stillWaitingForDevice(device.name || '')
          : BLUETOOTH_MESSAGES.waitingForDevice(device.name || '')

      const scheduleWaitingPoll = () => {
        if (waitingPollTimeoutRef.current) {
          clearTimeout(waitingPollTimeoutRef.current)
        }
        waitingPollTimeoutRef.current = setTimeout(() => {
          waitingPollTimeoutRef.current = null
          // Each 60s window re-arms "nearby" detection: only
          // advertisements in the current window count.
          waitAdSeenRef.current = false
          attemptWakeConnect()
        }, ADVERTISEMENT_FALLBACK_POLL_MS)
      }

      const recordWakeMiss = () => {
        waitMissesRef.current++
        // connectToGatt only writes UI on timeouts; restore the wait
        // (or escalate to guidance) so a stray banner doesn't stick.
        setStatus(BluetoothConnectionStatus.RECONNECTING)
        setCustomStatusMessage(waitingMessage())
        scheduleWaitingPoll()
      }

      const attemptWakeConnect = () => {
        if (waitingDeviceRef.current !== device) return
        if (currentStatusRef.current === BluetoothConnectionStatus.CONNECTED) {
          stopWaitingForDevice()
          return
        }
        if (
          isConnecting.current ||
          isManualDisconnect.current ||
          isUnmountedRef.current
        ) {
          return
        }
        // Advertisements arrive ~1Hz: without a cooldown every one would
        // fire a radio op, spinning a refusing strap's adapter hot.
        const now = Date.now()
        if (now - lastWakeAttemptAtRef.current < WAKE_ATTEMPT_COOLDOWN_MS) {
          return
        }
        lastWakeAttemptAtRef.current = now
        // Single attempts (no quiet retries): the 60s cadence IS the
        // retry loop, and each miss fails fast.
        connectToGattRef
          .current?.(device, true, false)
          ?.then((connected) => {
            if (waitingDeviceRef.current !== device) return
            if (connected) {
              stopWaitingForDevice()
            } else {
              recordWakeMiss()
            }
          })
          .catch(() => {
            if (waitingDeviceRef.current !== device) return
            recordWakeMiss()
          })
      }

      // Primary: passive advertisement watcher for instant wake. May be
      // absent or reject (platform/permission variance) — failure falls
      // through to the slow poll below, which always arms.
      const watch = (
        device as unknown as { watchAdvertisements?: () => Promise<void> }
      ).watchAdvertisements
      if (typeof watch === 'function') {
        const listener = () => {
          waitAdSeenRef.current = true
          attemptWakeConnect()
        }
        device.addEventListener('advertisementreceived', listener)
        waitingAdvertisementRef.current = { device, listener }
        try {
          const started: unknown = watch()
          if (started instanceof Promise) {
            started.catch((error: unknown) => {
              logger.debug(
                { device: device.name, error },
                'Advertisement watch rejected; polling only.'
              )
            })
          }
        } catch (error) {
          logger.debug(
            { device: device.name, error },
            'Advertisement watch threw; polling only.'
          )
        }
      } else {
        logger.debug(
          { device: device.name },
          'No advertisement watcher on this platform; polling only.'
        )
      }

      scheduleWaitingPoll()
    },
    [stopWaitingForDevice]
  )

  const handleConnectionError = useCallback((error: unknown) => {
    let msg = BLUETOOTH_MESSAGES.unknownError
    if (error instanceof DOMException) {
      if (error.name === 'NotFoundError') {
        msg = BLUETOOTH_MESSAGES.connectionCancelled
      } else if (error.name === 'SecurityError') {
        msg = BLUETOOTH_MESSAGES.securityError
      } else if (error.name === 'NetworkError') {
        msg = BLUETOOTH_MESSAGES.connectionFailed
      } else {
        msg = BLUETOOTH_MESSAGES.bluetoothError(error.name)
      }
    } else if (error instanceof Error) {
      // Handle our custom timeout error
      if (error.message.includes('timeout')) {
        msg = BLUETOOTH_MESSAGES.connectionTimeout
      } else {
        msg = `Error: ${error.message}`
      }
    }
    setStatus(BluetoothConnectionStatus.ERROR)
    setCustomStatusMessage(BLUETOOTH_MESSAGES.errorWithDetails(msg))
    logger.error({ error }, msg)
  }, [])

  const reconnect = useCallback(
    (device: BluetoothDevice, reason = 'Connection lost') => {
      claimConnectionAttempt()
      if (reconnectHaltedRef.current) {
        // A GATT timeout already stopped this episode's burst: the radio
        // needs settle time, not another immediate attempt — but stopping
        // dead would strand the user on an ERROR banner with only a manual
        // retry for company. Wait instead: no rapid radio ops, and the
        // strap is still caught automatically when it reappears. Consume
        // the halt so a later episode starts fresh.
        reconnectHaltedRef.current = false
        logger.warn(
          { device: device.name },
          'Reconnect halted after GATT timeout; waiting for the strap.'
        )
        startWaitingForDevice(device)
        return
      }
      if (reconnectAttempts.current >= BLUETOOTH_MAX_RECONNECT_ATTEMPTS) {
        // A sleeping strap is not a dead pairing: keep the saved device
        // and wait for it to reappear instead of forcing a re-pair.
        logger.warn(
          { device: device.name },
          'Reconnect attempts exhausted; waiting for the strap to reappear.'
        )
        startWaitingForDevice(device)
        return
      }

      reconnectAttempts.current++
      const delay = getBackoffDelay(reconnectAttempts.current)

      const isBusy =
        reason.toLowerCase().includes('busy') ||
        reason.toLowerCase().includes('networkerror')

      setStatus(
        isBusy
          ? BluetoothConnectionStatus.CONNECTING
          : BluetoothConnectionStatus.RECONNECTING
      )

      const statusMessage = isBusy
        ? BLUETOOTH_MESSAGES.deviceBusy(
            delay,
            reconnectAttempts.current,
            BLUETOOTH_MAX_RECONNECT_ATTEMPTS
          )
        : BLUETOOTH_MESSAGES.reconnectingAttempt(
            reason,
            reconnectAttempts.current,
            BLUETOOTH_MAX_RECONNECT_ATTEMPTS
          )

      setCustomStatusMessage(statusMessage)

      reconnectTimeoutRef.current = setTimeout(() => {
        if (
          currentStatusRef.current !== BluetoothConnectionStatus.CONNECTED &&
          !isConnecting.current &&
          !isManualDisconnect.current
        ) {
          connectToGattRef.current?.(device, true).catch((error: unknown) => {
            logger.warn({ error }, 'Reconnect attempt failed')
            reconnect(
              device,
              error instanceof Error ? error.message : String(error)
            )
          })
        }
      }, delay)
    },
    [startWaitingForDevice, claimConnectionAttempt]
  )

  const onDisconnected = useCallback(
    (event: Event | undefined) => {
      const device =
        (event?.target as BluetoothDevice) ?? connectedDeviceRef.current
      if (!device) {
        logger.warn('onDisconnected called without a device reference.')
        return
      }

      logger.info(
        {
          device: device.name,
          manual: isManualDisconnect.current,
          timeout: isTimeoutDisconnect.current,
        },
        'Device disconnected'
      )
      setBatteryLevel(null)
      setStatus(BluetoothConnectionStatus.DISCONNECTED)

      if (isManualDisconnect.current) {
        logger.info('Not attempting to reconnect (manual disconnect).')
        reconnectAttempts.current = 0
        reconnectHaltedRef.current = false
        if (reconnectTimeoutRef.current)
          clearTimeout(reconnectTimeoutRef.current)
        return
      }

      // Start the reconnection process
      reconnectAttempts.current = 0
      reconnectHaltedRef.current = false
      stopWaitingForDevice()
      reconnect(device, 'Connection lost')
    },
    [reconnect, stopWaitingForDevice]
  )

  // Cleanup
  useEffect(() => {
    isManualDisconnect.current = false

    // Identities installed below; the cleanup only removes slots that still
    // hold these exact functions (a remount overwrites them with its own).
    let installedControls: HrmTestControls | null = null

    if (
      typeof window !== 'undefined' &&
      clientEnv.NEXT_PUBLIC_TESTING === 'true'
    ) {
      // Test injections claim ownership like any newer operation, so a
      // racing silent auto-connect cannot wipe injected VRT state.
      const setTestStatus: Dispatch<
        SetStateAction<BluetoothConnectionStatus>
      > = (action) => {
        claimConnectionAttempt()
        setStatus(action)
      }
      const setTestMessage: Dispatch<SetStateAction<string | null>> = (
        action
      ) => {
        claimConnectionAttempt()
        setCustomStatusMessage(action)
      }
      window.__TEST_CONTROLS__ = {
        ...window.__TEST_CONTROLS__,
        setHrmStatus: setTestStatus,
        setCustomHrmStatusMessage: setTestMessage,
        setSignalStatus,
      }
      installedControls = {
        setHrmStatus: setTestStatus,
        setCustomHrmStatusMessage: setTestMessage,
        setSignalStatus,
      }
    }

    return () => {
      isUnmountedRef.current = true
      if (connectedDeviceRef.current && activeDisconnectListenerRef.current) {
        connectedDeviceRef.current.removeEventListener(
          'gattserverdisconnected',
          activeDisconnectListenerRef.current
        )
        activeDisconnectListenerRef.current = null
      }
      if (activeHrSubscriptionRef.current) {
        const { characteristic, listener } = activeHrSubscriptionRef.current
        characteristic.removeEventListener(
          'characteristicvaluechanged',
          listener
        )
        activeHrSubscriptionRef.current = null
      }
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
      stopWaitingForDevice()
      if (installedControls) teardownTestControls(installedControls)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // A live connection ends any wait (covers watcher, poll, and manual wins).
  useEffect(() => {
    if (status === BluetoothConnectionStatus.CONNECTED) stopWaitingForDevice()
  }, [status, stopWaitingForDevice])

  /**
   * Moves the GATT disconnect listener onto the newly connected device,
   * detaching it from any previous device first. Extracted from
   * connectToGatt's post-connect wiring.
   */
  const swapDisconnectListener = useCallback(
    (device: BluetoothDevice) => {
      if (activeDisconnectListenerRef.current) {
        // If we are connecting to a new device, we should remove the listener from the OLD device (connectedDeviceRef.current)
        // or the current device if it's a reconnect. To be safe, try removing from both if they differ.
        const oldDevice = connectedDeviceRef.current
        if (oldDevice) {
          oldDevice.removeEventListener(
            'gattserverdisconnected',
            activeDisconnectListenerRef.current
          )
        }
        // Also try removing from the new device just in case
        if (device !== oldDevice) {
          device.removeEventListener(
            'gattserverdisconnected',
            activeDisconnectListenerRef.current
          )
        }
      }
      device.addEventListener('gattserverdisconnected', onDisconnected)
      activeDisconnectListenerRef.current = onDisconnected
    },
    [onDisconnected]
  )

  /**
   * Heart-rate notification handler, extracted from connectToGatt's
   * subscription wiring. All state flows through refs and stable setters,
   * so this callback only depends on the signal-period updater.
   */
  const handleHrMeasurement = useCallback(
    (event: unknown) => {
      const now = Date.now()
      if (lastDataTime.current > 0) {
        const delta = now - lastDataTime.current
        updateSignalPeriod(delta)

        const isSlow = delta > STABILITY_THRESHOLD_MS
        const watchdogWindows = Math.floor(
          lastWatchdogMark.current / STABILITY_THRESHOLD_MS
        )

        setSignalStatus((s) => {
          // If the packet arrived and was slow, but the watchdog already counted it,
          // we don't increment again. If it's fast, we reset the slow counter.
          let nextSlow = isSlow ? s.slow : 0
          if (isSlow && watchdogWindows === 0) {
            nextSlow = s.slow + 1
          }

          return {
            last: delta,
            slow: nextSlow,
          }
        })

        // Synchronize watchdog mark with arrival to prevent double-counting
        // when the watchdog timer next fires.
        lastWatchdogMark.current = delta
      }

      const e = event as Event
      const target = e.target as BluetoothRemoteGATTCharacteristic
      const value = target.value
      if (!value) {
        logger.warn(
          'Received characteristic value changed event with no value.'
        )
        return
      }
      const heartRate = parseHeartRate(value)
      lastDataTime.current = now // Update timestamp for next delta
      lastWatchdogMark.current = 0 // Reset watchdog mark for new packet
      logger.debug({ heartRate }, 'Heart rate data received from Bluetooth')
      onHeartRateUpdateRef.current?.(heartRate)
    },
    [updateSignalPeriod]
  )

  /**
   * Moves the heart-rate notification subscription onto the current
   * characteristic, unsubscribing the previous one first. Without this a
   * reconnect to an already-seen characteristic object stacks duplicate
   * listeners and every beat is counted twice (HR callbacks and the
   * signal-period stats). Mirrors swapDisconnectListener.
   */
  const swapHrListener = useCallback(
    (characteristic: BluetoothRemoteGATTCharacteristic) => {
      const active = activeHrSubscriptionRef.current
      if (active) {
        active.characteristic.removeEventListener(
          'characteristicvaluechanged',
          active.listener
        )
      }
      characteristic.addEventListener(
        'characteristicvaluechanged',
        handleHrMeasurement
      )
      activeHrSubscriptionRef.current = {
        characteristic,
        listener: handleHrMeasurement,
      }
    },
    [handleHrMeasurement]
  )

  /**
   * Failure path for connectToGatt: severs half-open links (zombie killer),
   * classifies the error, and writes the matching status, then hands the
   * error back so the caller rethrows from the original site (preserving
   * the throw stack). Extracted verbatim from the catch block; ref- and
   * setter-only.
   */
  const handleGattFailure = useCallback(
    (device: BluetoothDevice, error: unknown): unknown => {
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
      const kind = classifyGattFailure(
        error,
        abortControllerRef.current?.signal.aborted ?? false
      )

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
    },
    []
  )

  const connectToGatt = useCallback(
    async (
      device: BluetoothDevice,
      isReconnect = false,
      retryQuietStrap = false
    ) => {
      if (isConnecting.current) {
        logger.warn(
          { device: device.name },
          'Connection already in progress. Skipping.'
        )
        return false
      }

      // Capture, don't claim: quiet-retries below yield to newer ops.
      const connectAttemptToken = connectionAttemptRef.current

      // Reaching here means no attempt is in flight (guard above) and the
      // previous controller was cleared in finally: start clean. Mid-flight
      // cancellation is owned solely by disconnect().
      isConnecting.current = true
      abortControllerRef.current = new AbortController()

      try {
        connectedDeviceRef.current = device

        if (!isReconnect) {
          setStatus(BluetoothConnectionStatus.CONNECTING)
          setCustomStatusMessage(
            BLUETOOTH_MESSAGES.connectingToDevice(device.name || '')
          )
        }

        let server: BluetoothRemoteGATTServer | undefined
        let busyRetries = 0
        let quietRetries = 0
        let lastError: unknown = null
        // Busy retries (≤3) plus quiet-strap retries (≤3) share this
        // loop; each path is bounded by its own counter below.
        for (
          let attempt = 1;
          attempt <=
          BUSY_RETRY_DELAYS_MS.length + QUIET_STRAP_RETRY_DELAYS_MS.length;
          attempt++
        ) {
          try {
            server = await cancellablePromise(device.gatt!.connect(), {
              timeoutMs: 20000,
              errorMessage: 'GATT connection timeout',
              signal: abortControllerRef.current.signal,
            })
            break
          } catch (error) {
            // Retry policy is pure (see classifyGattConnectError); this
            // block only executes the action: UI writes, sleeps, and the
            // post-sleep re-checks.
            const action = classifyGattConnectError(String(error), {
              linkUp: device.gatt?.connected ?? false,
              aborted: abortControllerRef.current?.signal.aborted ?? false,
              attempt,
              busyRetriesUsed: busyRetries,
              quietRetriesUsed: quietRetries,
              retryQuietStrap,
              manualDisconnect: isManualDisconnect.current,
              unmounted: isUnmountedRef.current,
              ownershipCurrent:
                connectionAttemptRef.current === connectAttemptToken,
            })
            if (action.kind === 'adopt-live-link') {
              logger.info(
                { device: device.name },
                'GATT link is up despite connect error; adopting it.'
              )
              server = device.gatt
              break
            }
            if (action.kind === 'busy-retry') {
              busyRetries++
              logger.warn(
                { device: device.name, attempt },
                'GATT connection busy, retrying with backoff...'
              )
              // Progress is UI-owned: only the current attempt may write it,
              // so a superseded silent retry never clobbers a newer manual
              // operation's message (same ownership rule as autoConnect).
              if (connectionAttemptRef.current === connectAttemptToken) {
                setStatus(BluetoothConnectionStatus.CONNECTING)
                setCustomStatusMessage(
                  BLUETOOTH_MESSAGES.deviceBusy(
                    action.delayMs,
                    action.retryNumber,
                    BUSY_RETRY_DELAYS_MS.length
                  )
                )
              }
              await new Promise((res) => setTimeout(res, action.delayMs))
              continue
            }
            if (action.kind === 'quiet-retry') {
              // Cancelled by a manual disconnect, unmount, or any newer
              // operation (ownership token); on cancel return false like
              // the in-flight guard ("someone else owns the radio")
              // instead of throwing.
              quietRetries++
              logger.info(
                { device: device.name, attempt: action.retryNumber },
                'Strap quiet, retrying shortly...'
              )
              // Surface the wait so the user sees progress instead of a
              // stuck "Connecting..." (and doesn't tap mid-retry). Gated on
              // the ownership token like the busy write above.
              if (connectionAttemptRef.current === connectAttemptToken) {
                setStatus(BluetoothConnectionStatus.CONNECTING)
                setCustomStatusMessage(
                  BLUETOOTH_MESSAGES.quietStrapRetry(
                    action.retryNumber,
                    QUIET_STRAP_RETRY_DELAYS_MS.length
                  )
                )
              }
              await new Promise((res) => setTimeout(res, action.delayMs))
              if (
                !isManualDisconnect.current &&
                !isUnmountedRef.current &&
                connectionAttemptRef.current === connectAttemptToken
              ) {
                continue
              }
              return false
            }
            lastError = error
            throw error
          }
        }

        // Unreachable in practice (every path above breaks, throws, or
        // returns), but a silent fall-through with no server would crash
        // service discovery confusingly — fail loudly instead.
        if (!server) {
          throw lastError instanceof Error
            ? lastError
            : new Error('GATT connection failed')
        }

        if (abortControllerRef.current?.signal.aborted) {
          server?.disconnect()
          throw new DOMException('Connection aborted', 'AbortError')
        }

        // Attach disconnect listener immediately after successful GATT connection
        // This ensures we catch disconnections that might occur during service discovery
        swapDisconnectListener(device)

        const service = await server!.getPrimaryService(HR_SERVICE_UUID)
        const characteristic = await service.getCharacteristic(
          HR_CHARACTERISTIC_UUID
        )

        await setupBatteryNotifications(server!, setBatteryLevel)

        await characteristic.startNotifications()

        swapHrListener(characteristic)

        setStatus(BluetoothConnectionStatus.CONNECTED)
        setCustomStatusMessage(
          BLUETOOTH_MESSAGES.connectedToDevice(device.name || '')
        )
        setSavedDevice(device)
        Cookies.set('hrm_device_id', device.id, {
          expires: 365,
          secure: clientEnv.NODE_ENV === 'production',
          sameSite: 'strict',
        })
        isManualDisconnect.current = false
        isTimeoutDisconnect.current = false
        reconnectAttempts.current = 0
        reconnectHaltedRef.current = false
        onConnectRef.current?.()
        return true
      } catch (error) {
        throw handleGattFailure(device, error)
      } finally {
        isConnecting.current = false
        // Clear the settled controller so a later fresh attempt never
        // "aborts" a stale one (the isConnecting guard above is the only
        // overlap protection needed).
        abortControllerRef.current = null
      }
    },
    [swapDisconnectListener, swapHrListener, handleGattFailure]
  )

  useEffect(() => {
    connectToGattRef.current = connectToGatt
  }, [connectToGatt])

  /**
   * Resolves the previously paired device via the saved cookie and
   * WebBluetooth's getDevices(), or null when none is available (silent
   * attempts without a saved ID throw to prevent looping). Extracted from
   * connectAndStream's device-resolution branch.
   */
  const findSavedDevice = useCallback(
    async (silent: boolean): Promise<BluetoothDevice | null> => {
      setCustomStatusMessage(BLUETOOTH_MESSAGES.checkingSavedDevices)
      const savedDeviceId = Cookies.get('hrm_device_id')

      // Abort silent connection if no device ID is found, to prevent looping.
      if (silent && !savedDeviceId) {
        logger.warn(
          { savedDeviceId },
          'Aborting silent connect: No saved device ID.'
        )
        throw new Error('No saved device ID for silent connection.')
      }

      logger.info(
        { savedDeviceId, hasGetDevices: !!navigator.bluetooth?.getDevices },
        'Looking for saved device'
      )
      if (savedDeviceId && navigator.bluetooth?.getDevices) {
        const devices = await navigator.bluetooth.getDevices()
        logger.info(
          { count: devices.length, savedDeviceId },
          'Available devices'
        )
        const foundDevice = devices.find((d) => d.id === savedDeviceId)

        if (foundDevice) {
          logger.info(
            { device: foundDevice.name },
            'Found saved device, connecting'
          )
          return foundDevice
        }
        logger.info(
          { savedDeviceId },
          'Saved device not found in available devices'
        )
        return null
      }
      logger.info(
        {
          savedDeviceId,
          hasGetDevices: !!navigator.bluetooth?.getDevices,
        },
        'Cannot get saved device'
      )
      return null
    },
    []
  )

  /**
   * Scans for a Bluetooth device, connects to it, and starts streaming heart rate data.
   * Will attempt to reconnect to a previously saved device if one exists.
   * @param userNameFromArgs The user's name for display purposes.
   * @param userAgeFromArgs The user's age, used to calculate max HR.
   * @throws If the connection fails (e.g., user cancellation, WebSocket disconnect).
   */
  const connectAndStream = useCallback(
    async (
      userNameFromArgs?: string,
      userAgeFromArgs?: number,
      options: { silent?: boolean } = {}
    ): Promise<boolean> => {
      const { silent = false } = options

      userDetailsRef.current = {
        name: userNameFromArgs || userName || '',
        age: userAgeFromArgs || userAge || 0,
      }

      if (currentStatusRef.current === BluetoothConnectionStatus.CONNECTED)
        return true
      // A connection attempt is already driving the radio (auto or manual):
      // don't open a second picker or handshake. The in-flight attempt owns
      // the UI; returning false tells this caller it did not connect.
      if (isConnecting.current) {
        logger.info('connectAndStream skipped: connection already in progress')
        return false
      }

      // Manual (non-silent) attempts that actually proceed take UI ownership
      // from any racing silent auto-connect. Skipped attempts (above) claim
      // nothing: they wrote no state, so the in-flight attempt still owns
      // the UI and its completion must land. Silent attempts never claim
      // (see autoConnect).
      if (!silent) {
        // A deliberate tap supersedes any background wait and resumes
        // automation (clears a prior manual stop).
        stopWaitingForDevice()
        isManualDisconnect.current = false
        claimConnectionAttempt()
      }
      // Capture, don't claim: a stale silent failure must not clobber UI
      // state written by a newer operation (same ownership rule as the
      // retry progress writes and autoConnect's completion guard).
      const attemptToken = connectionAttemptRef.current
      if (connectionStatus !== 'Connected') {
        const err = new Error('WebSocket not connected')
        if (!silent) handleConnectionError(err)
        throw err
      }

      let attemptedDevice: BluetoothDevice | null = null
      try {
        logger.info(
          { connectionStatus, savedDevice },
          'connectAndStream called'
        )
        setStatus(BluetoothConnectionStatus.CONNECTING)
        const device = await resolveConnectDevice(silent, {
          savedDevice,
          findSavedDevice,
          onScanning: () => {
            setStatus(BluetoothConnectionStatus.CONNECTING)
            setCustomStatusMessage(BLUETOOTH_MESSAGES.scanningForDevices)
          },
        })

        if (device) {
          attemptedDevice = device
          logger.info({ device: device.name }, 'Connecting to device')
          if (!(await connectToGatt(device, false, true))) return false
          return true
        }
        if (!silent) {
          logger.info('No device to connect')
          throw new Error('No device found or selected for connection.')
        }
        return false // Silent mode: no device available
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          throw error
        }
        if (!silent) {
          handleConnectionError(error)
          throw error
        }
        const errorMsg = error instanceof Error ? error.message : String(error)
        logger.info({ error, errorMsg }, 'Silent auto-connect failed.')
        // Reset the status to allow for a manual connection attempt —
        // but only while no newer operation has claimed the UI since,
        // so a late background failure never wipes a manual attempt's
        // CONNECTING/ERROR state. With a known device, wait for it to
        // reappear instead of stopping dead (issue 9806).
        if (connectionAttemptRef.current === attemptToken) {
          if (attemptedDevice) {
            startWaitingForDevice(attemptedDevice)
          } else {
            setStatus(BluetoothConnectionStatus.DISCONNECTED)
          }
        }
        throw error
      }
    },
    [
      connectionStatus,
      savedDevice,
      connectToGatt,
      findSavedDevice,
      handleConnectionError,
      userName,
      userAge,
      // Stable ref object from useHrmMetadataSync; listed for exhaustive-deps.
      userDetailsRef,
      claimConnectionAttempt,
      stopWaitingForDevice,
      startWaitingForDevice,
    ]
  )

  const autoConnect = useCallback(async (): Promise<void> => {
    // Never auto-connect after a manual stop: disconnect() resets
    // connectionAttempted, so the page effect refires this — without this
    // guard a manual disconnect would silently undo itself 100ms later.
    if (isConnecting.current || isManualDisconnect.current) return

    // Capture, don't claim: silent attempts yield to any newer operation.
    const attempt = connectionAttemptRef.current

    try {
      setConnectionAttempted(true)
      setStatus(BluetoothConnectionStatus.CONNECTING)
      setCustomStatusMessage(BLUETOOTH_MESSAGES.connectingToSavedDevice)

      const deviceFoundAndAttempted = await connectAndStream(
        undefined,
        undefined,
        { silent: true }
      )

      if (!deviceFoundAndAttempted) {
        // Stale-completion guard: a late silent finish must not wipe newer
        // state (a manual connect tap, or test-injected scan state racing
        // this attempt). Only the latest operation owns the UI. A wait
        // armed by the silent attempt also owns it (see connectAndStream).
        if (
          connectionAttemptRef.current === attempt &&
          !waitingDeviceRef.current
        ) {
          setStatus(BluetoothConnectionStatus.DISCONNECTED)
          setCustomStatusMessage(null)
        }
      }
    } catch (error) {
      logger.error({ error }, 'Auto-connect failed')
      if (
        connectionAttemptRef.current === attempt &&
        !waitingDeviceRef.current
      ) {
        setStatus(BluetoothConnectionStatus.DISCONNECTED)
        setCustomStatusMessage(getAutoConnectFailureMessage(error))
      }
    }
  }, [connectAndStream])

  return {
    connectAndStream,
    autoConnect,
    disconnect,
    forgetDevice,
    deviceStatus,
    batteryLevel,
    isConnected: status === BluetoothConnectionStatus.CONNECTED,
    isSupported, // Export this flag
    signalPeriodMs,
    lastPeriodMs: signalStatus.last,
    consecutiveSlowPackets: signalStatus.slow,
    connectionAttempted,
  }
}

export default useBluetoothHRM
