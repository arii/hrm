import { ConnectedHrmData, ClientHrmData, ActiveAlert } from '@/types/websocket'
import {
  HRM_STALE_THRESHOLD_MS,
  HRM_WARNING_THRESHOLD_MS,
} from '@/utils/constants'
import { calculateHrZoneInfo } from '@/lib/shared/hr-zones'

interface GetActiveHrmDataOptions {
  includeZeroValues?: boolean
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
      const { percentage, zone } = calculateHrZoneInfo(user.value, {
        method: 'MAX_HR',
        age: user.age,
      })

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

const GENERIC_NAME_REGEX = /^(user|unknown|new user|bluetooth hrm)(\s+\d+)?$/i

/**
 * Checks if a user name is generic (e.g., "User", "New User").
 * @param name - The name to check.
 * @returns True if the name is generic.
 */
export const isGenericName = (name?: string | null): boolean => {
  if (!name) return true
  return GENERIC_NAME_REGEX.test(name.trim())
}
