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

export const useHeartRateLiveness = (
  hrmData: HrmData[]
): HeartRateLivenessResult[] => {
  const now = useNow(HRM_LIVENESS_POLL_INTERVAL_MS)

  return useMemo(() => {
    return hrmData.map((user) => {
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
