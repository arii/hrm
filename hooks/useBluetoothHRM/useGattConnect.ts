import {
  useCallback,
  useRef,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from 'react'
import { BluetoothConnectionStatus } from '@/types/bluetooth'
import logger from '@/utils/logger'
import { clientEnv } from '@/lib/env-client'
import { cancellablePromise } from '@/utils/promise'
import Cookies from 'js-cookie'
import { BLUETOOTH_MESSAGES } from '@/constants/bluetooth-messages'
import {
  BUSY_RETRY_DELAYS_MS,
  QUIET_STRAP_RETRY_DELAYS_MS,
} from '@/constants/bluetooth-reconnection'
import {
  applyGattFailure,
  classifyGattConnectError,
} from './gattClassification'
import { setupBatteryNotifications } from './batteryNotifications'
import { HR_CHARACTERISTIC_UUID, HR_SERVICE_UUID } from './constants'

/** Signature of the GATT connect operation exposed to the recovery loop. */
export type ConnectToGattFn = (
  device: BluetoothDevice,
  isReconnect?: boolean,
  retryQuietStrap?: boolean
) => Promise<boolean>

interface UseGattConnectParams {
  connectedDeviceRef: MutableRefObject<BluetoothDevice | null>
  onDisconnected: (event: Event | undefined) => void
  connectionAttemptRef: MutableRefObject<number>
  reconnectHaltedRef: MutableRefObject<boolean>
  isConnecting: MutableRefObject<boolean>
  isManualDisconnect: MutableRefObject<boolean>
  isTimeoutDisconnect: MutableRefObject<boolean>
  isUnmountedRef: MutableRefObject<boolean>
  reconnectAttempts: MutableRefObject<number>
  onConnectRef: MutableRefObject<(() => void) | undefined>
  swapHrListener: (characteristic: BluetoothRemoteGATTCharacteristic) => void
  setStatus: Dispatch<SetStateAction<BluetoothConnectionStatus>>
  setCustomStatusMessage: Dispatch<SetStateAction<string | null>>
  setBatteryLevel: Dispatch<SetStateAction<number | null>>
  setSavedDevice: Dispatch<SetStateAction<BluetoothDevice | null>>
}

/**
 * GATT connect slice of the Bluetooth HRM hook: the connect retry loop
 * with its busy/quiet-strap schedule, the failure handler (zombie killer
 * + classification), the disconnect-listener swap, and the in-flight
 * abort controller disconnect() pulls. Connection state and callbacks
 * arrive as refs and setters; the retry policy itself is pure (see
 * gattClassification).
 */
export const useGattConnect = ({
  connectedDeviceRef,
  onDisconnected,
  connectionAttemptRef,
  reconnectHaltedRef,
  isConnecting,
  isManualDisconnect,
  isTimeoutDisconnect,
  isUnmountedRef,
  reconnectAttempts,
  onConnectRef,
  swapHrListener,
  setStatus,
  setCustomStatusMessage,
  setBatteryLevel,
  setSavedDevice,
}: UseGattConnectParams) => {
  const abortControllerRef = useRef<AbortController | null>(null)
  const activeDisconnectListenerRef = useRef<((event: Event) => void) | null>(
    null
  )

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
    [onDisconnected, connectedDeviceRef]
  )

  /**
   * Unmount cleanup: detach the active disconnect listener from the
   * connected device. A no-op when no listener is installed.
   */
  const removeDisconnectListener = useCallback(() => {
    if (connectedDeviceRef.current && activeDisconnectListenerRef.current) {
      connectedDeviceRef.current.removeEventListener(
        'gattserverdisconnected',
        activeDisconnectListenerRef.current
      )
      activeDisconnectListenerRef.current = null
    }
  }, [connectedDeviceRef])

  /** Abort an in-flight connect attempt (disconnect()'s cancellation path). */
  const abortInFlightConnect = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
  }, [])

  /**
   * Failure path for connectToGatt: severs half-open links (zombie killer),
   * classifies the error, and writes the matching status, then hands the
   * error back so the caller rethrows from the original site (preserving
   * the throw stack). Extracted verbatim from the catch block; ref- and
   * setter-only.
   */
  const handleGattFailure = useCallback(
    (device: BluetoothDevice, error: unknown): unknown =>
      applyGattFailure({
        device,
        error,
        aborted: abortControllerRef.current?.signal.aborted ?? false,
        connectedDeviceRef,
        reconnectHaltedRef,
        setStatus,
        setCustomStatusMessage,
      }),
    [connectedDeviceRef, reconnectHaltedRef, setStatus, setCustomStatusMessage]
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

        // Proactive adoption: a previous attempt (or a previous page load)
        // may have left the OS link up while this state machine thinks it
        // is down — bluetooth-internals connected, page dead, no data.
        // Discovery on the live link costs zero radio ops and cannot
        // collide with anything; only connect() when the link is down.
        let server: BluetoothRemoteGATTServer | undefined = device.gatt
          ?.connected
          ? device.gatt
          : undefined
        if (server) {
          logger.info(
            { device: device.name },
            'GATT link already up; adopting without a radio call.'
          )
        }
        let busyRetries = 0
        let quietRetries = 0
        let lastError: unknown = null
        // Busy retries (≤3) plus quiet-strap retries (≤3) share this
        // loop; each path is bounded by its own counter below.
        for (
          let attempt = 1;
          !server &&
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
    [
      isConnecting,
      connectedDeviceRef,
      setStatus,
      setCustomStatusMessage,
      connectionAttemptRef,
      isManualDisconnect,
      isTimeoutDisconnect,
      isUnmountedRef,
      swapDisconnectListener,
      swapHrListener,
      setBatteryLevel,
      setSavedDevice,
      reconnectAttempts,
      reconnectHaltedRef,
      onConnectRef,
      handleGattFailure,
    ]
  )

  return {
    connectToGatt,
    abortInFlightConnect,
    removeDisconnectListener,
  }
}

export type UseGattConnect = ReturnType<typeof useGattConnect>
