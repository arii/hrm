import {
  ConnectedHrmData,
  ClientHrmData,
  ActiveAlert,
  HrmData,
} from '../types/websocket.js'
import {
  HRM_STALE_THRESHOLD_MS,
  HRM_WARNING_THRESHOLD_MS,
} from './constants.js'
import {
  calculateZoneFromMaxHr,
  toHeartRateZone,
} from '../lib/shared/hr-zones.js'
import { calculateMaxHr } from './hrCalculations.js'

interface FilterHrmDataOptions {
  includeZeroValues?: boolean
}

/**
 * Filters HRM data based on staleness, generic names, and zero values.
 * This is intended to be the single source of truth for "active" HRM data,
 * primarily executed on the server.
 */
export const filterHrmData = <T extends HrmData | ConnectedHrmData>(
  hrmData: T[],
  now: number,
  options: FilterHrmDataOptions = {}
): T[] => {
  const { includeZeroValues = false } = options

  return hrmData.filter((user) => {
    const isZero = user.value === 0
    const isPlaceholderName = isGenericName(user.name)
    const hasNoIdentity = user.name == null
    // Use the sensor's timestamp if available, otherwise fall back to now
    // In ConnectedHrmData, lastUpdated might be available as receipt time
    const referenceTime =
      user.updatedAt ??
      ('lastUpdated' in user
        ? (user as { lastUpdated?: number }).lastUpdated
        : null) ??
      now
    const isStale = now - referenceTime > HRM_STALE_THRESHOLD_MS

    if (isPlaceholderName || hasNoIdentity || isStale) {
      return false
    }

    if (!includeZeroValues && isZero) {
      return false
    }

    return true
  })
}

/**
 * Augments filtered HRM data with UI-specific indicators like alerts and zones.
 * This remains on the client to support real-time visual feedback.
 */
export const augmentHrmData = (
  hrmData: ConnectedHrmData[],
  activeAlerts: ActiveAlert[],
  now: number
): ClientHrmData[] => {
  return hrmData.map((user) => {
    const matchingAlert = activeAlerts.find(
      (alert) =>
        alert.clientId === user.clientId &&
        (alert.code === 'BAD_PLACEMENT' || alert.code === 'HRM_STALE')
    )

    // Use the same reference time logic for the visual warning
    const referenceTime = user.updatedAt ?? user.lastUpdated ?? now
    const isDataStale = now - referenceTime > HRM_WARNING_THRESHOLD_MS

    // Pre-calculate HR zone info if not already present
    const { zone, percentage } = calculateZoneFromMaxHr(
      user.value,
      calculateMaxHr(user.age)
    )
    const heartRateZone = toHeartRateZone(zone)

    return {
      ...user,
      isAlerting: !!matchingAlert,
      alertMessage: matchingAlert?.message,
      isDataStale,
      percentage: user.percentage ?? percentage,
      zone: user.zone ?? heartRateZone,
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
