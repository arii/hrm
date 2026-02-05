'use client'
import { useMemo } from 'react'
import { useNow } from './useNow'
import { HrmData } from '@/types/websocket'
import {
  HRM_STALE_WARNING_MS,
  HRM_STALE_THRESHOLD_MS,
  HRM_LIVENESS_POLL_INTERVAL_MS,
} from '@/constants/hrm'

export interface HeartRateLivenessResult extends HrmData {
  isDataStale: boolean
  isExpired: boolean
}

/**
 * A hook that monitors the liveness of heart rate data for each user.
 * It adds `isDataStale` and `isExpired` flags based on the `updatedAt` timestamp
 * received from the server.
 *
 * @param hrmData - The array of HRM data from the WebSocket context.
 * @returns The array of HRM data with added liveness flags.
 */
export const useHeartRateLiveness = (
  hrmData: HrmData[]
): HeartRateLivenessResult[] => {
  // Update at a regular interval to ensure tiles transition to stale/expired
  // even if no new messages are received from the WebSocket.
  const now = useNow(HRM_LIVENESS_POLL_INTERVAL_MS)

  return useMemo(() => {
    return hrmData.map((user) => {
      // Prioritize `updatedAt` (server-side data timestamp) over `lastUpdate` (client-side message timestamp).
      // Fallback to `now` if neither is available (should not happen for active tiles).
      const lastSeen = user.updatedAt || user.lastUpdate || now
      const diff = now - lastSeen

      return {
        ...user,
        isDataStale: diff > HRM_STALE_WARNING_MS,
        isExpired: diff > HRM_STALE_THRESHOLD_MS,
      }
    })
  }, [hrmData, now])
}
