import {
  useCallback,
  useRef,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from 'react'
import { BluetoothConnectionStatus } from '@/types/bluetooth'
import logger from './connectionLog'
import { clientEnv } from '@/lib/env-client'
import { abortableSleep, cancellablePromise } from '@/utils/promise'
import Cookies from 'js-cookie'
import { BLUETOOTH_MESSAGES } from '@/constants/bluetooth-messages'
import {
  BUSY_RETRY_DELAYS_MS,
  QUIET_STRAP_RETRY_DELAYS_MS,
  SETUP_DROP_RETRY_DELAYS_MS,
} from '@/constants/bluetooth-reconnection'
import {
  applyGattFailure,
  classifyGattConnectError,
  classifyGattFailure,
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
  beginRadioOp: () => () => void
  markRadioProgress: () => void
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
  beginRadioOp,
  markRadioProgress,
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
    (device: BluetoothDevice, error: unknown, aborted: boolean): unknown =>
      applyGattFailure({
        device,
        error,
        aborted,
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
      const ownsAttempt = () =>
        connectionAttemptRef.current === connectAttemptToken

      // Per-attempt controller: a Connect tap or Reset that takes over
      // aborts this one, and the next attempt's controller never shares
      // its signal.
      const endRadioOp = beginRadioOp()
      const controller = new AbortController()
      abortControllerRef.current = controller
      const { signal } = controller
      // Every completed step counts as progress for the stuck detector.
      const throwIfAborted = () => {
        markRadioProgress()
        if (signal.aborted) {
          throw new DOMException('Connection aborted', 'AbortError')
        }
      }

      /**
       * Opens the GATT link: adopts a live one, else connects with the
       * busy and quiet-strap retry schedules. Resolves undefined when a
       * quiet retry is cancelled by a newer operation.
       */
      const openLink = async (): Promise<
        BluetoothRemoteGATTServer | undefined
      > => {
        // Proactive adoption: a previous attempt (or a previous page load)
        // may have left the OS link up while this state machine thinks it
        // is down. Discovery on the live link costs zero radio ops and
        // cannot collide with anything; only connect() when the link is
        // down.
        if (device.gatt?.connected) {
          logger.info(
            { device: device.name },
            'GATT link already up; adopting without a radio call.'
          )
          return device.gatt
        }
        let busyRetries = 0
        let quietRetries = 0
        // Busy retries (up to 3) plus quiet-strap retries (up to 3) share
        // this loop; each path is bounded by its own counter below.
        const maxAttempts =
          1 + BUSY_RETRY_DELAYS_MS.length + QUIET_STRAP_RETRY_DELAYS_MS.length
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          markRadioProgress()
          try {
            return await cancellablePromise(device.gatt!.connect(), {
              timeoutMs: 20000,
              errorMessage: 'GATT connection timeout',
              signal,
            })
          } catch (error) {
            // Retry policy is pure (see classifyGattConnectError); this
            // block only executes the action: UI writes, sleeps, and the
            // post-sleep re-checks.
            const action = classifyGattConnectError(String(error), {
              linkUp: device.gatt?.connected ?? false,
              aborted: signal.aborted,
              attempt,
              busyRetriesUsed: busyRetries,
              quietRetriesUsed: quietRetries,
              retryQuietStrap,
              manualDisconnect: isManualDisconnect.current,
              unmounted: isUnmountedRef.current,
              ownershipCurrent: ownsAttempt(),
            })
            if (action.kind === 'adopt-live-link') {
              logger.info(
                { device: device.name },
                'GATT link is up despite connect error; adopting it.'
              )
              return device.gatt
            }
            if (action.kind === 'busy-retry') {
              busyRetries++
              logger.warn(
                {
                  device: device.name,
                  attempt,
                  retry: action.retryNumber,
                  maxRetries: BUSY_RETRY_DELAYS_MS.length,
                },
                'GATT connection busy, retrying with backoff...'
              )
              // Progress is UI-owned: only the current attempt may write it,
              // so a superseded silent retry never clobbers a newer manual
              // operation's message (same ownership rule as autoConnect).
              if (ownsAttempt()) {
                setStatus(BluetoothConnectionStatus.CONNECTING)
                setCustomStatusMessage(
                  BLUETOOTH_MESSAGES.deviceBusy(action.delayMs)
                )
              }
              markRadioProgress()
              await abortableSleep(action.delayMs, signal)
              continue
            }
            if (action.kind === 'quiet-retry') {
              // Cancelled by a manual disconnect, unmount, or any newer
              // operation (ownership token); on cancel resolve undefined
              // ("someone else owns the radio") instead of throwing.
              quietRetries++
              logger.info(
                {
                  device: device.name,
                  retry: action.retryNumber,
                  maxRetries: QUIET_STRAP_RETRY_DELAYS_MS.length,
                },
                'Strap quiet, retrying shortly...'
              )
              // Surface the wait so the user sees progress instead of a
              // stuck "Connecting..." (and doesn't tap mid-retry). Gated on
              // the ownership token like the busy write above.
              if (ownsAttempt()) {
                setStatus(BluetoothConnectionStatus.CONNECTING)
                setCustomStatusMessage(BLUETOOTH_MESSAGES.quietStrapRetry)
              }
              markRadioProgress()
              await abortableSleep(action.delayMs, signal)
              if (
                !isManualDisconnect.current &&
                !isUnmountedRef.current &&
                ownsAttempt()
              ) {
                continue
              }
              return undefined
            }
            throw error
          }
        }
        // Every retry path above is bounded by the classifier, so running
        // out of loop iterations means the policy and maxAttempts drifted.
        throw new Error('GATT connection failed: retry budget exhausted')
      }

      /** Service discovery through the first HR notification setup. */
      const subscribe = async (server: BluetoothRemoteGATTServer) => {
        const service = await server.getPrimaryService(HR_SERVICE_UUID)
        throwIfAborted()
        const characteristic = await service.getCharacteristic(
          HR_CHARACTERISTIC_UUID
        )
        throwIfAborted()
        await setupBatteryNotifications(server, setBatteryLevel)
        throwIfAborted()
        await characteristic.startNotifications()
        throwIfAborted()
        return characteristic
      }

      try {
        connectedDeviceRef.current = device

        if (!isReconnect) {
          setStatus(BluetoothConnectionStatus.CONNECTING)
          setCustomStatusMessage(
            BLUETOOTH_MESSAGES.connectingToDevice(device.name || '')
          )
        }

        for (let setupDrops = 0; ; setupDrops++) {
          const server = await openLink()
          if (!server) return false

          if (signal.aborted) {
            server.disconnect()
            throwIfAborted()
          }

          // Attach the disconnect listener before discovery so a drop
          // during setup is seen. While this attempt holds the radio,
          // onDisconnected leaves the drop to the retry below.
          swapDisconnectListener(device)

          try {
            swapHrListener(await subscribe(server))
            break
          } catch (error) {
            const delay = SETUP_DROP_RETRY_DELAYS_MS[setupDrops]
            const retryable =
              delay !== undefined &&
              !signal.aborted &&
              ownsAttempt() &&
              !isManualDisconnect.current &&
              !isUnmountedRef.current &&
              classifyGattFailure(error, false) ===
                'disconnected-during-connect'
            if (!retryable) throw error
            logger.warn(
              {
                device: device.name,
                retry: setupDrops + 1,
                maxRetries: SETUP_DROP_RETRY_DELAYS_MS.length,
                error,
              },
              'Link dropped during setup; reconnecting'
            )
            try {
              device.gatt?.disconnect()
            } catch {
              // Already down: nothing to close.
            }
            await abortableSleep(delay, signal)
          }
        }

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
        throw handleGattFailure(device, error, signal.aborted)
      } finally {
        endRadioOp()
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null
        }
      }
    },
    [
      isConnecting,
      beginRadioOp,
      markRadioProgress,
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
