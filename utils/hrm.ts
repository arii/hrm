import { ConnectedHrmData, ClientHrmData, ActiveAlert } from '@/types/websocket'
import {
  HRM_STALE_THRESHOLD_MS,
  HRM_WARNING_THRESHOLD_MS,
} from '@/utils/constants'
import { calculateHrZoneInfo } from '@/lib/shared/hr-zones'

interface GetActiveHrmDataOptions {
  includeZeroValues?: boolean
}

// Canonical source of truth for checking if a name is a generic placeholder.
export const isGenericName = (name: string | null | undefined): boolean => {
  if (!name) return true
  // Matches "user", "new user", "unknown", "bluetooth hrm" with optional numbering
  return /^(user|new user|unknown|bluetooth hrm)(\s+\d+)?$/i.test(name)
}

export const getActiveHrmData = (
  hrmData: ConnectedHrmData[],
  activeAlerts: ActiveAlert[],
  now: number,
  options: GetActiveHrmDataOptions = {}
): ClientHrmData[] => {
  const { includeZeroValues = false } = options

  return hrmData
    .filter((user) => {
      const isZero = user.value === 0
      const isPlaceholderName = isGenericName(user.name)
      const hasNoIdentity = user.name == null
      // Use the sensor's timestamp if available, otherwise fall back to receipt time
      const referenceTime = user.updatedAt || user.lastUpdated || now
      const isStale = now - referenceTime > HRM_STALE_THRESHOLD_MS

      if (isPlaceholderName || hasNoIdentity || isStale) {
        return false
      }

      if (!includeZeroValues && isZero) {
        return false
      }

      return true
    })
    .map((user) => {
      const matchingAlert = activeAlerts.find(
        (alert) =>
          alert.clientId === user.clientId &&
          (alert.code === 'BAD_PLACEMENT' || alert.code === 'HRM_STALE')
      )

      // Use the same reference time logic for the visual warning
      const referenceTime = user.updatedAt || user.lastUpdated || now
      const isDataStale = now - referenceTime > HRM_WARNING_THRESHOLD_MS

      // Pre-calculate HR zone info if not already present
      const { percentage, zone } = calculateHrZoneInfo(user.value, user.age)

      return {
        ...user,
        isAlerting: !!matchingAlert,
        alertMessage: matchingAlert?.message,
        isDataStale,
        percentage: user.percentage ?? percentage,
        zone: user.zone ?? zone,
      }
    })
}
