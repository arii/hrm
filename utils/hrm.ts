import { ClientHrmData, HrmData } from '@/context/webSocketReducer'
import { ActiveAlert } from '@/types/websocket'
import {
  HRM_STALE_THRESHOLD_MS,
  HRM_WARNING_THRESHOLD_MS,
} from '@/utils/constants'

export type ActiveHrmData = ClientHrmData & {
  isDataStale: boolean
}

interface GetActiveHrmDataOptions {
  includeZeroValues?: boolean
}

export const getActiveHrmData = (
  hrmData: HrmData[],
  activeAlerts: ActiveAlert[],
  now: number,
  options: GetActiveHrmDataOptions = {}
): ActiveHrmData[] => {
  const { includeZeroValues = false } = options

  // Create a Map for O(1) lookup of alerts
  const alertMap = new Map<string, ActiveAlert>()
  for (const alert of activeAlerts) {
    if (alert.code === 'BAD_PLACEMENT' || alert.code === 'HRM_STALE') {
      alertMap.set(alert.clientId, alert)
    }
  }

  return hrmData
    .filter((user) => {
      const isZero = user.value === 0
      const isPlaceholderName = !!user.name && /new user/i.test(user.name)
      const hasNoIdentity = user.name == null
      const isStale =
        user.lastUpdated && now - user.lastUpdated > HRM_STALE_THRESHOLD_MS

      if (isPlaceholderName || hasNoIdentity || isStale) {
        return false
      }

      if (!includeZeroValues && isZero) {
        return false
      }

      return true
    })
    .map((user) => {
      const matchingAlert = alertMap.get(user.clientId)

      const isDataStale = !!(
        user.lastUpdated && now - user.lastUpdated > HRM_WARNING_THRESHOLD_MS
      )

      return {
        ...user,
        isAlerting: !!matchingAlert,
        alertMessage: matchingAlert?.message,
        isDataStale,
      }
    })
}
