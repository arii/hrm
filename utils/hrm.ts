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

const PLACEHOLDER_NAME_REGEX = /new user/i
const ALERT_CODE_BAD_PLACEMENT = 'BAD_PLACEMENT'
const ALERT_CODE_HRM_STALE = 'HRM_STALE'

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
    if (
      alert.code === ALERT_CODE_BAD_PLACEMENT ||
      alert.code === ALERT_CODE_HRM_STALE
    ) {
      alertMap.set(alert.clientId, alert)
    }
  }

  return hrmData.reduce<ActiveHrmData[]>((acc, user) => {
    const isZero = user.value === 0
    const isPlaceholderName =
      !!user.name && PLACEHOLDER_NAME_REGEX.test(user.name)
    const hasNoIdentity = user.name == null
    const isStale =
      user.lastUpdated && now - user.lastUpdated > HRM_STALE_THRESHOLD_MS

    if (
      isPlaceholderName ||
      hasNoIdentity ||
      isStale ||
      (!includeZeroValues && isZero)
    ) {
      return acc
    }

    const matchingAlert = alertMap.get(user.clientId)
    const isDataStale = !!(
      user.lastUpdated && now - user.lastUpdated > HRM_WARNING_THRESHOLD_MS
    )

    acc.push({
      ...user,
      isAlerting: !!matchingAlert,
      alertMessage: matchingAlert?.message,
      isDataStale,
    })

    return acc
  }, [])
}
