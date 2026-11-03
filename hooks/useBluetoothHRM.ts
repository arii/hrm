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
import { useWebSocket } from '@/context/WebSocketContext'
import { useHrmMetadataSync } from '@/hooks/useHrmMetadataSync'
import { clientEnv } from '@/lib/env-client'
import { cancellablePromise } from '@/utils/promise'
import Cookies from 'js-cookie'
import { BLUETOOTH_MESSAGES } from '@/constants/bluetooth-messages'
import {
  BLUETOOTH_MAX_RECONNECT_ATTEMPTS,
  getBackoffDelay,
  FAST_RECONNECT_DELAY_MS,
  FAST_RECONNECT_MAX_ATTEMPTS,
  QUIET_STRAP_RETRY_DELAYS_MS,
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
    /no longer in range|device not found/i.test(errorMsg)
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
  const { sendData, connectionStatus } = useWebSocket()
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
  const isConnecting = useRef(false)
  const activeDisconnectListenerRef = useRef<((event: Event) => void) | null>(
    null
  )

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

  const abortControllerRef = useRef<AbortController | null>(null)
  const connectToGattRef = useRef<
    | ((device: BluetoothDevice, isReconnect?: boolean) => Promise<boolean>)
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

      checkCounter++
      if (checkCounter % 2 === 0 && dataLivenessTimeoutMs > 0) {
        if (
          currentStatusRef.current === BluetoothConnectionStatus.CONNECTED &&
          lastDataTime.current > 0
        ) {
          const timeSinceLastData = Date.now() - lastDataTime.current

          if (timeSinceLastData > dataLivenessTimeoutMs) {
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
      }
    }, heartbeatInterval)

    return () => clearInterval(interval)
  }, [dataLivenessTimeoutMs, updateSignalPeriod, heartbeatInterval])

  const disconnect = useCallback(() => {
    claimConnectionAttempt()
    isManualDisconnect.current = true
    isTimeoutDisconnect.current = false
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
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
  }, [claimConnectionAttempt])

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
      if (reconnectAttempts.current >= BLUETOOTH_MAX_RECONNECT_ATTEMPTS) {
        setCustomStatusMessage(
          BLUETOOTH_MESSAGES.failedToReconnect(BLUETOOTH_MAX_RECONNECT_ATTEMPTS)
        )
        logger.error(
          'Failed to reconnect after max attempts. Forgetting device.'
        )
        // Delay forgetDevice to allow the final status message to be displayed
        setTimeout(forgetDevice, 1500)
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
    [forgetDevice, claimConnectionAttempt]
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
        if (reconnectTimeoutRef.current)
          clearTimeout(reconnectTimeoutRef.current)
        return
      }

      // Start the reconnection process
      reconnectAttempts.current = 0
      reconnect(device, 'Connection lost')
    },
    [reconnect]
  )

  // Cleanup
  useEffect(() => {
    isManualDisconnect.current = false

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
    }

    return () => {
      if (connectedDeviceRef.current && activeDisconnectListenerRef.current) {
        connectedDeviceRef.current.removeEventListener(
          'gattserverdisconnected',
          activeDisconnectListenerRef.current
        )
        activeDisconnectListenerRef.current = null
      }
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
      if (
        typeof window !== 'undefined' &&
        clientEnv.NEXT_PUBLIC_TESTING === 'true' &&
        window.__TEST_CONTROLS__
      ) {
        if (window.__TEST_CONTROLS__.setHrmStatus === setStatus) {
          delete window.__TEST_CONTROLS__.setHrmStatus
        }
        if (
          window.__TEST_CONTROLS__.setCustomHrmStatusMessage ===
          setCustomStatusMessage
        ) {
          delete window.__TEST_CONTROLS__.setCustomHrmStatusMessage
        }
        if (window.__TEST_CONTROLS__.setSignalStatus === setSignalStatus) {
          delete window.__TEST_CONTROLS__.setSignalStatus
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
        let quietRetries = 0
        let lastError: unknown = null
        // Busy fast-retries (≤3) plus quiet-strap retries (≤3) share this
        // loop; each path is bounded by its own counter below.
        for (
          let attempt = 1;
          attempt <=
          FAST_RECONNECT_MAX_ATTEMPTS + QUIET_STRAP_RETRY_DELAYS_MS.length;
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
            // Adopt slow links: our 20s timer can fire while the radio is
            // still coming up (sleeping strap, BlueZ scan+connect). If the
            // link is up, adopt the live server object directly instead of
            // failing — device.gatt IS the connected server, so this costs
            // zero new radio ops and cannot collide with the still-pending
            // original connect() (a second connect() call could throw
            // "already in progress"). Without this we severed a good link
            // and wiped the saved device for a strap that was just slow.
            const errorText = String(error)
            if (
              errorText.includes('timeout') &&
              device.gatt?.connected &&
              !abortControllerRef.current?.signal.aborted
            ) {
              logger.info(
                { device: device.name },
                'GATT link came up after our timeout; adopting it.'
              )
              server = device.gatt
              break
            }
            // Fast-retry only a busy radio. "No longer in range" fails fast:
            // hammering gatt.connect() cannot summon an absent device and the
            // extra radio ops risk wedging the adapter (self-inflicted busy).
            const isBusy =
              !errorText.includes('no longer in range') &&
              (errorText.includes('busy') || errorText.includes('NetworkError'))
            if (isBusy && attempt < FAST_RECONNECT_MAX_ATTEMPTS) {
              logger.warn(
                { device: device.name, attempt },
                'GATT connection busy, fast-retrying...'
              )
              await new Promise((res) =>
                setTimeout(res, FAST_RECONNECT_DELAY_MS)
              )
              continue
            }
            // Quiet-strap retry: the first radio op often fails fast ("no
            // longer in range") while the adapter/strap wakes; retry a few
            // times over ~35s. Only instant misses qualify: a 20s timeout
            // already consumed a full radio engagement (and slow-link wins
            // are adopted above), so re-hammering a timing-out radio would
            // risk the adapter wedging #9303 warned about. Cancelled by a
            // manual disconnect or any newer operation (ownership token);
            // on cancel return false like the in-flight guard ("someone
            // else owns the radio") instead of throwing.
            const quietDelay = QUIET_STRAP_RETRY_DELAYS_MS[quietRetries]
            if (
              retryQuietStrap &&
              quietDelay !== undefined &&
              /no longer in range|device not found/i.test(errorText) &&
              !isManualDisconnect.current &&
              connectionAttemptRef.current === connectAttemptToken
            ) {
              quietRetries++
              logger.info(
                { device: device.name, attempt: quietRetries },
                'Strap quiet, retrying shortly...'
              )
              await new Promise((res) => setTimeout(res, quietDelay))
              if (
                !isManualDisconnect.current &&
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

        const service = await server!.getPrimaryService(HR_SERVICE_UUID)
        const characteristic = await service.getCharacteristic(
          HR_CHARACTERISTIC_UUID
        )

        await setupBatteryNotifications(server!, setBatteryLevel)

        await characteristic.startNotifications()

        characteristic.addEventListener(
          'characteristicvaluechanged',
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
            logger.debug(
              { heartRate },
              'Heart rate data received from Bluetooth'
            )
            onHeartRateUpdateRef.current?.(heartRate)
          }
        )

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
        onConnectRef.current?.()
        return true
      } catch (error) {
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

        const isIntentionalAbort =
          errorName === 'AbortError' &&
          abortControllerRef.current?.signal.aborted

        const isGattDisconnected =
          errorMsg.includes('GATT Server is disconnected') ||
          errorMsg.includes('GATT operation failed')

        if (!isIntentionalAbort) {
          logger.error(
            { errorName, errorMsg, device: device.name },
            'GATT Connection failed'
          )
        }

        if (errorMsg.includes('timeout')) {
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
          reconnectAttempts.current = BLUETOOTH_MAX_RECONNECT_ATTEMPTS
          connectedDeviceRef.current = null
        } else if (isGattDisconnected) {
          logger.warn(
            { device: device.name },
            'Device disconnected during connection. Will attempt auto-reconnect.'
          )
          connectedDeviceRef.current = null
        } else if (!isIntentionalAbort) {
          connectedDeviceRef.current = null
        }

        throw error
      } finally {
        isConnecting.current = false
        // Clear the settled controller so a later fresh attempt never
        // "aborts" a stale one (the isConnecting guard above is the only
        // overlap protection needed).
        abortControllerRef.current = null
      }
    },
    [onDisconnected, updateSignalPeriod]
  )

  useEffect(() => {
    connectToGattRef.current = connectToGatt
  }, [connectToGatt])

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
      if (!silent) claimConnectionAttempt()
      if (connectionStatus !== 'Connected') {
        const err = new Error('WebSocket not connected')
        if (!silent) handleConnectionError(err)
        throw err
      }

      try {
        logger.info(
          { connectionStatus, savedDevice },
          'connectAndStream called'
        )
        setStatus(BluetoothConnectionStatus.CONNECTING)
        let device = savedDevice

        if (!device) {
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
              if (!(await connectToGatt(foundDevice, false, true))) return false
              return true
            } else {
              logger.info(
                { savedDeviceId },
                'Saved device not found in available devices'
              )
            }
          } else {
            logger.info(
              {
                savedDeviceId,
                hasGetDevices: !!navigator.bluetooth?.getDevices,
              },
              'Cannot get saved device'
            )
          }
        }

        if (!device && !silent) {
          setStatus(BluetoothConnectionStatus.CONNECTING)
          setCustomStatusMessage(BLUETOOTH_MESSAGES.scanningForDevices)
          device = await navigator.bluetooth.requestDevice({
            filters: [{ services: [HR_SERVICE_UUID] }],
            optionalServices: [BATTERY_SERVICE_UUID],
          })
        }

        if (device) {
          logger.info({ device: device.name }, 'Connecting to device')
          if (!(await connectToGatt(device, false, true))) return false
          return true
        } else if (!silent) {
          logger.info('No device to connect')
          throw new Error('No device found or selected for connection.')
        }
        return false // Silent mode: no device available
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        if (error instanceof DOMException && error.name === 'AbortError') {
          throw error
        }
        if (!silent) {
          handleConnectionError(error)
        } else {
          logger.info({ error, errorMsg }, 'Silent auto-connect failed.')
          // Reset the status to allow for a manual connection attempt.
          setStatus(BluetoothConnectionStatus.DISCONNECTED)
          throw error
        }
        if (!silent) {
          throw error
        }
        return false
      }
    },
    [
      connectionStatus,
      savedDevice,
      connectToGatt,
      handleConnectionError,
      userName,
      userAge,
      // Stable ref object from useHrmMetadataSync; listed for exhaustive-deps.
      userDetailsRef,
      claimConnectionAttempt,
    ]
  )

  const autoConnect = useCallback(async (): Promise<void> => {
    if (isConnecting.current) return

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
        // this attempt). Only the latest operation owns the UI.
        if (connectionAttemptRef.current === attempt) {
          setStatus(BluetoothConnectionStatus.DISCONNECTED)
          setCustomStatusMessage(null)
        }
      }
    } catch (error) {
      logger.error({ error }, 'Auto-connect failed')
      if (connectionAttemptRef.current === attempt) {
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
