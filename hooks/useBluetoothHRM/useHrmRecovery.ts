import {
  useCallback,
  useRef,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from 'react'
import { BluetoothConnectionStatus } from '@/types/bluetooth'
import logger from '@/utils/logger'
import { BLUETOOTH_MESSAGES } from '@/constants/bluetooth-messages'
import {
  BLUETOOTH_MAX_RECONNECT_ATTEMPTS,
  getBackoffDelay,
  ADVERTISEMENT_FALLBACK_POLL_MS,
  WAKE_ATTEMPT_COOLDOWN_MS,
  WAIT_GUIDANCE_AFTER_MISSES,
} from '@/constants/bluetooth-reconnection'
import type { ConnectToGattFn } from './useGattConnect'

interface UseHrmRecoveryParams {
  connectedDeviceRef: MutableRefObject<BluetoothDevice | null>
  currentStatusRef: MutableRefObject<BluetoothConnectionStatus>
  connectToGattRef: MutableRefObject<ConnectToGattFn | null>
  claimConnectionAttempt: () => void
  reconnectHaltedRef: MutableRefObject<boolean>
  isConnecting: MutableRefObject<boolean>
  isManualDisconnect: MutableRefObject<boolean>
  isTimeoutDisconnect: MutableRefObject<boolean>
  isUnmountedRef: MutableRefObject<boolean>
  setStatus: Dispatch<SetStateAction<BluetoothConnectionStatus>>
  setCustomStatusMessage: Dispatch<SetStateAction<string | null>>
  setBatteryLevel: Dispatch<SetStateAction<number | null>>
}

/**
 * Reconnection slice of the Bluetooth HRM hook: the backoff reconnect
 * loop, the waiting-for-device fallback (issue 9806), and the
 * gattserverdisconnected handler that feeds them. Owns the retry and
 * waiting refs; the connect machinery and connection state arrive as
 * refs and setters, so this module can be tested without a radio.
 */
export const useHrmRecovery = ({
  connectedDeviceRef,
  currentStatusRef,
  connectToGattRef,
  claimConnectionAttempt,
  reconnectHaltedRef,
  isConnecting,
  isManualDisconnect,
  isTimeoutDisconnect,
  isUnmountedRef,
  setStatus,
  setCustomStatusMessage,
  setBatteryLevel,
}: UseHrmRecoveryParams) => {
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
    [
      stopWaitingForDevice,
      reconnectHaltedRef,
      setStatus,
      setCustomStatusMessage,
      currentStatusRef,
      isConnecting,
      isManualDisconnect,
      isUnmountedRef,
      connectToGattRef,
    ]
  )

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
    [
      startWaitingForDevice,
      claimConnectionAttempt,
      connectToGattRef,
      currentStatusRef,
      isConnecting,
      isManualDisconnect,
      reconnectHaltedRef,
      setStatus,
      setCustomStatusMessage,
    ]
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [reconnect, stopWaitingForDevice]
  )

  return {
    reconnect,
    onDisconnected,
    startWaitingForDevice,
    stopWaitingForDevice,
    reconnectAttempts,
    reconnectTimeoutRef,
    waitingDeviceRef,
  }
}
