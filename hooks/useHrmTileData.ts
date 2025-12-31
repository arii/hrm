// File: hooks/useHrmTileData.ts
import { useMemo } from 'react'
import { HrmData, ActiveAlert } from '@/types/websocket'

/**
 * @hook useHrmTileData
 * @description Filters and processes HRM data for display in tiles.
 * @param {HrmData[]} hrmData - The raw HRM data.
 * @param {ActiveAlert[]} activeAlerts - The active alerts.
 * @returns {object[]} The filtered and processed tile data.
 */
const useHrmTileData = (hrmData: HrmData[], activeAlerts: ActiveAlert[]) => {
  const tileData = useMemo(() => {
    // Filter out users with placeholder names or no identity
    return hrmData
      .filter((user) => {
        const isPlaceholderName = !!user.name && /new user/i.test(user.name)
        const hasNoIdentity = user.name == null
        return !(isPlaceholderName || hasNoIdentity)
      })
      .map((user) => {
        const matchingAlert = activeAlerts.find(
          (alert) =>
            alert.clientId === user.clientId &&
            (alert.code === 'BAD_PLACEMENT' || alert.code === 'HRM_STALE')
        )

        return {
          ...user,
          isAlerting: !!matchingAlert,
          alertMessage: matchingAlert?.message,
        }
      })
  }, [hrmData, activeAlerts])

  return tileData
}

export default useHrmTileData
