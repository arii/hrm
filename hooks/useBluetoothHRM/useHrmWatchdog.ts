import {
  useCallback,
  useEffect,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from 'react'
import { BluetoothConnectionStatus } from '@/types/bluetooth'
import logger from '@/utils/logger'
import { BLUETOOTH_MESSAGES } from '@/constants/bluetooth-messages'

interface UseHrmWatchdogParams {
  currentStatusRef: MutableRefObject<BluetoothConnectionStatus>
  lastDataTime: MutableRefObject<number>
  connectedDeviceRef: MutableRefObject<BluetoothDevice | null>
  isConnecting: MutableRefObject<boolean>
  isTimeoutDisconnect: MutableRefObject<boolean>
  setStatus: Dispatch<SetStateAction<BluetoothConnectionStatus>>
  setCustomStatusMessage: Dispatch<SetStateAction<string | null>>
  checkSignalStability: () => void
  dataLivenessTimeoutMs: number
  heartbeatInterval: number
}

/**
 * Liveness slice of the Bluetooth HRM hook: the heartbeat interval that
 * probes signal stability and force-cycles a link gone quiet past the
 * liveness timeout. Stream state arrives from the signal-stats slice;
 * connection state arrives as refs and setters.
 */
export const useHrmWatchdog = ({
  currentStatusRef,
  lastDataTime,
  connectedDeviceRef,
  isConnecting,
  isTimeoutDisconnect,
  setStatus,
  setCustomStatusMessage,
  checkSignalStability,
  dataLivenessTimeoutMs,
  heartbeatInterval,
}: UseHrmWatchdogParams) => {
  /**
   * Liveness half of the watchdog interval: force-cycles a link that has
   * gone quiet past the timeout. The timeout arrives as a parameter (prop
   * value), so this callback stays ref- and setter-only. Extracted from
   * the interval tick.
   */
  const checkDataLiveness = useCallback(
    (livenessTimeoutMs: number) => {
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
    },
    [
      currentStatusRef,
      lastDataTime,
      isConnecting,
      isTimeoutDisconnect,
      connectedDeviceRef,
      setStatus,
      setCustomStatusMessage,
    ]
  )

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

  return { checkDataLiveness }
}
