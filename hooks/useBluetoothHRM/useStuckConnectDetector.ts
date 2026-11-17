import { useEffect, useRef, type MutableRefObject } from 'react'
import {
  STUCK_CHECK_INTERVAL_MS,
  STUCK_CONNECT_TIMEOUT_MS,
} from '@/constants/bluetooth-reconnection'
import logger from './connectionLog'
import type { ConnectToGattFn } from './useGattConnect'

interface UseStuckConnectDetectorParams {
  isConnecting: MutableRefObject<boolean>
  connectionAttemptRef: MutableRefObject<number>
  radioProgressAtRef: MutableRefObject<number>
  waitingDeviceRef: MutableRefObject<BluetoothDevice | null>
  isManualDisconnect: MutableRefObject<boolean>
  connectToGattRef: MutableRefObject<ConnectToGattFn | null>
  /** Auto-resets this episode; the hook zeroes it on a successful connect. */
  stuckResetsRef: MutableRefObject<number>
  getDevice: () => BluetoothDevice | null
  hardResetRadio: (reason: string) => Promise<void>
  startWaitingForDevice: (device: BluetoothDevice) => void
  /** Second stuck attempt in one episode: name the failure. */
  onGiveUp: () => void
  /** Stuck with no known strap to retry: return to idle. */
  onNoDevice: () => void
}

/**
 * Resets a connect attempt that holds the radio with no step of progress
 * for STUCK_CONNECT_TIMEOUT_MS, without waiting for a tap. The open-ended
 * wait for the strap is never treated as stuck. The first stuck attempt of
 * an episode is reset and retried once (or falls back to waiting for the
 * strap); a second one is reset and handed to onGiveUp.
 */
export const useStuckConnectDetector = (
  params: UseStuckConnectDetectorParams
) => {
  // Read through a ref so the interval runs once per mount, not per render.
  const paramsRef = useRef(params)
  useEffect(() => {
    paramsRef.current = params
  })

  useEffect(() => {
    const timer = setInterval(() => {
      const p = paramsRef.current
      if (!p.isConnecting.current || p.waitingDeviceRef.current) return
      if (Date.now() - p.radioProgressAtRef.current < STUCK_CONNECT_TIMEOUT_MS)
        return
      const device = p.getDevice()
      const firstEpisode = p.stuckResetsRef.current === 0
      p.stuckResetsRef.current++
      logger.warn(
        { device: device?.name, episode: p.stuckResetsRef.current },
        'stuck connect, auto-resetting'
      )
      // The reset claims ownership synchronously; a tap or Reset during its
      // unwind claims again and owns the radio from then on.
      const reset = p.hardResetRadio('stuck connect')
      const resetToken = p.connectionAttemptRef.current
      void reset.then(() => {
        if (p.connectionAttemptRef.current !== resetToken) return
        if (!firstEpisode) {
          p.onGiveUp()
          return
        }
        if (!device) {
          p.onNoDevice()
          return
        }
        p.connectToGattRef.current?.(device, false, false).catch(() => {
          if (!p.isManualDisconnect.current) p.startWaitingForDevice(device)
        })
      })
    }, STUCK_CHECK_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [])
}
