import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MutableRefObject,
} from 'react'
import { BluetoothConnectionStatus } from '@/types/bluetooth'
import logger from '@/utils/logger'
import {
  STABILITY_THRESHOLD_MS,
  MISSED_PACKET_THRESHOLD_BUFFER_MS,
  MIN_MISSED_PACKET_THRESHOLD_MS,
  ROLLING_AVG_HISTORY_LENGTH,
} from '@/constants/bluetooth'
import { parseHeartRate } from './heartRateParser'

interface UseHrSignalStatsParams {
  currentStatusRef: MutableRefObject<BluetoothConnectionStatus>
  onHeartRateUpdate?: (heartRate: number) => void
}

/**
 * Stream-parsing slice of the Bluetooth HRM hook: the heart-rate
 * measurement handler, the notification subscription swap, and the
 * signal-period/slow-packet statistics the UI and watchdog read. Owns the
 * stream refs and signal state; connection status arrives as a ref.
 */
export const useHrSignalStats = ({
  currentStatusRef,
  onHeartRateUpdate,
}: UseHrSignalStatsParams) => {
  const [signalPeriodMs, setSignalPeriodMs] = useState(0)
  const [signalStatus, setSignalStatus] = useState({ last: 0, slow: 0 })
  const periodHistory = useRef<number[]>([])
  const avgPeriodMs = useRef<number>(0)
  const lastDataTime = useRef<number>(0)
  const lastWatchdogMark = useRef<number>(0)
  const activeHrSubscriptionRef = useRef<{
    characteristic: BluetoothRemoteGATTCharacteristic
    listener: (event: unknown) => void
  } | null>(null)
  const onHeartRateUpdateRef = useRef(onHeartRateUpdate)

  useEffect(() => {
    onHeartRateUpdateRef.current = onHeartRateUpdate
  }, [onHeartRateUpdate])

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
  }, [updateSignalPeriod, currentStatusRef])

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

  /** Unmount cleanup: detach the active characteristic listener. */
  const removeHrListener = useCallback(() => {
    if (activeHrSubscriptionRef.current) {
      const { characteristic, listener } = activeHrSubscriptionRef.current
      characteristic.removeEventListener('characteristicvaluechanged', listener)
      activeHrSubscriptionRef.current = null
    }
  }, [])

  /** Manual-disconnect reset: zeroes the signal statistics. */
  const resetSignalStats = useCallback(() => {
    periodHistory.current = []
    avgPeriodMs.current = 0
    setSignalPeriodMs(0)
    setSignalStatus({ last: 0, slow: 0 })
  }, [])

  return {
    signalPeriodMs,
    setSignalStatus,
    signalStatus,
    lastDataTime,
    updateSignalPeriod,
    checkSignalStability,
    handleHrMeasurement,
    swapHrListener,
    removeHrListener,
    resetSignalStats,
  }
}
