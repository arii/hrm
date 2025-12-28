// File: services/calorieService.ts
import {
  HrmDataRepository,
  HrmData,
} from '../lib/repositories/HrmDataRepository.js'
import { estimateCaloriesBurned } from '../lib/calorie-estimation.js'
import { USER_AGE_DEFAULT, USER_WEIGHT_DEFAULT_KG } from '../utils/constants.js'
import logger from '../utils/logger.js'

let calorieUpdateInterval: NodeJS.Timeout | undefined

/**
 * In-memory store for client-specific session data required for interval-based
 * calorie calculations.
 * - `lastUpdate`: The timestamp of the last time calories were calculated for the client.
 * - `hrSamples`: A collection of heart rate samples gathered since the last update.
 * - `consecutiveFailures`: Counter for tracking failed repository saves.
 */
const clientSessionState = new Map<
  string,
  { lastUpdate: number; hrSamples: number[]; consecutiveFailures: number }
>()

/**
 * Calculates the calories burned during a single time interval based on average
 * heart rate and client data.
 * @param avgHr - The average heart rate over the interval.
 * @param lastUpdate - The timestamp of the last update.
 * @param clientData - The HRM data for the client.
 * @returns The estimated calories burned, or 0 if conditions are not met.
 */
export const calculateIntervalCalories = (
  avgHr: number,
  lastUpdate: number,
  clientData: HrmData
): number => {
  const now = Date.now()
  const durationMinutes = (now - lastUpdate) / 1000 / 60

  // Guard against invalid inputs or large time gaps (e.g., system sleep)
  if (avgHr <= 30 || durationMinutes <= 0 || durationMinutes >= 5) {
    return 0
  }

  return estimateCaloriesBurned({
    heartRate: avgHr,
    age: clientData.age ?? USER_AGE_DEFAULT,
    weightKg: clientData.weightKg ?? USER_WEIGHT_DEFAULT_KG,
    durationMinutes,
  })
}

const updateCaloriesForClient = (
  clientId: string,
  hrmDataRepository: HrmDataRepository
): boolean => {
  const session = clientSessionState.get(clientId)
  const clientData = hrmDataRepository.findById(clientId)

  if (!session || !clientData || session.hrSamples.length === 0) {
    return false
  }

  const avgHr =
    session.hrSamples.reduce((sum, val) => sum + val, 0) /
    session.hrSamples.length

  // Reset samples and update timestamp for the next interval
  session.hrSamples = []
  const lastUpdate = session.lastUpdate
  session.lastUpdate = Date.now()

  const caloriesBurned = calculateIntervalCalories(
    avgHr,
    lastUpdate,
    clientData
  )

  if (caloriesBurned > 0) {
    try {
      const currentTotal = clientData.totalCalories ?? 0
      hrmDataRepository.save({
        ...clientData,
        totalCalories: Math.round((currentTotal + caloriesBurned) * 10) / 10,
      })
      session.consecutiveFailures = 0 // Reset on success
      return true // Calories were updated
    } catch (error) {
      session.consecutiveFailures++
      logger.error(
        {
          clientId,
          error,
          consecutiveFailures: session.consecutiveFailures,
        },
        'Failed to save updated calorie data'
      )
      // Restore session state if save fails to allow for retry on next tick
      session.lastUpdate = lastUpdate

      if (session.consecutiveFailures > 3) {
        logger.warn(
          { clientId, consecutiveFailures: session.consecutiveFailures },
          'High number of consecutive calorie save failures detected.'
        )
      }
    }
  } else {
    // If no calories were burned, it's not a failure, so reset the counter.
    session.consecutiveFailures = 0
  }

  return false // No calories updated
}

export const updateCaloriesForAllClients = (
  hrmDataRepository: HrmDataRepository,
  broadcastState: () => void
) => {
  let needsBroadcast = false
  hrmDataRepository.findAll().forEach((client) => {
    if (updateCaloriesForClient(client.clientId, hrmDataRepository)) {
      needsBroadcast = true
    }
  })

  if (needsBroadcast) {
    broadcastState()
  }
}

export const startCalorieService = (
  hrmDataRepository: HrmDataRepository,
  broadcastState: () => void
) => {
  if (!calorieUpdateInterval) {
    calorieUpdateInterval = setInterval(
      () => updateCaloriesForAllClients(hrmDataRepository, broadcastState),
      15000
    ) // 15-second interval
  }
}

export const stopCalorieService = () => {
  if (calorieUpdateInterval) {
    clearInterval(calorieUpdateInterval)
    calorieUpdateInterval = undefined
  }
}

export const resetCalorieService = () => {
  stopCalorieService()
  clientSessionState.clear()
}

export const getClientSessionState = () => clientSessionState
