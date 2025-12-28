// services/calorieService.ts
/**
 * Calorie Service: Manages real-time calorie estimation for connected clients.
 * This service buffers heart rate (HR) samples and calculates calories burned
 * over a defined time interval to provide a more stable and accurate estimation
 * compared to per-event calculations.
 */

import { HrmDataRepository } from '../lib/repositories/HrmDataRepository.js'
import { estimateCaloriesBurned } from '../lib/calorie-estimation.js'
import {
  CALORIE_UPDATE_INTERVAL_MS,
  CALORIE_MAX_GAP_MINUTES,
  CALORIE_DEFAULTS,
} from '../utils/constants.js'
import logger from '../utils/logger.js'

// --- Internal State and Types ---

interface CalorieSession {
  lastUpdate: number
  hrSamples: number[]
  consecutiveFailures: number
}

const clientSessionState = new Map<string, CalorieSession>()
let hrmDataRepository: HrmDataRepository
let calculationInterval: NodeJS.Timeout | null = null

// --- Service Lifecycle Functions ---

/**
 * Starts the calorie calculation service.
 * @param repository - An instance of HrmDataRepository.
 */
export const startCalorieService = (repository: HrmDataRepository): void => {
  if (calculationInterval) {
    logger.warn('Calorie service is already running.')
    return
  }
  hrmDataRepository = repository
  calculationInterval = setInterval(
    () => processCalorieUpdate(hrmDataRepository),
    CALORIE_UPDATE_INTERVAL_MS
  )
  logger.info('Calorie service started.')
}

/**
 * Stops the calorie calculation service and clears the interval.
 */
export const stopCalorieService = (): void => {
  if (calculationInterval) {
    clearInterval(calculationInterval)
    calculationInterval = null
    logger.info('Calorie service stopped.')
  }
}

// --- Client Session Management ---

/**
 * Initializes a new tracking session for a client.
 * @param clientId - The unique identifier for the client.
 */
export const initializeClientSession = (clientId: string): void => {
  clientSessionState.set(clientId, {
    lastUpdate: Date.now(),
    hrSamples: [],
    consecutiveFailures: 0,
  })
  logger.info({ clientId }, 'Initialized calorie tracking session.')
}

/**
 * Records a new heart rate sample for a client.
 * @param clientId - The client's unique identifier.
 * @param hr - The heart rate sample to record.
 */
export const recordHeartRateSample = (clientId: string, hr: number): void => {
  const session = clientSessionState.get(clientId)
  if (session && hr > 0) {
    session.hrSamples.push(hr)
    session.lastUpdate = Date.now()
  }
}

/**
 * Terminates a client's tracking session and removes their data.
 * @param clientId - The client's unique identifier.
 */
export const terminateClientSession = (clientId: string): void => {
  clientSessionState.delete(clientId)
  logger.info({ clientId }, 'Terminated calorie tracking session.')
}

// --- Core Calculation Logic ---

/**
 * Processes the calorie update for all active client sessions.
 * This function is executed by the service's internal timer.
 */
export const processCalorieUpdate = (
  hrmDataRepository: HrmDataRepository
): void => {
  const now = Date.now()
  for (const [clientId, session] of clientSessionState.entries()) {
    const clientData = hrmDataRepository.findById(clientId)
    if (!clientData) {
      logger.warn(
        { clientId },
        'Client data not found for calorie update, terminating session.'
      )
      terminateClientSession(clientId)
      continue
    }

    const minutesSinceLastUpdate = (now - session.lastUpdate) / 1000 / 60
    if (minutesSinceLastUpdate > CALORIE_MAX_GAP_MINUTES) {
      logger.info(
        { clientId, minutesSinceLastUpdate },
        'Stale session detected, skipping calorie update.'
      )
      session.hrSamples = [] // Clear samples after a long gap
      continue
    }

    if (session.hrSamples.length === 0) {
      // No new HR data, do nothing.
      continue
    }

    const avgHr =
      session.hrSamples.reduce((sum, val) => sum + val, 0) /
      session.hrSamples.length

    const durationMinutes = CALORIE_UPDATE_INTERVAL_MS / 1000 / 60

    const caloriesBurned = estimateCaloriesBurned({
      heartRate: avgHr,
      age: clientData.age ?? 30,
      weightKg: CALORIE_DEFAULTS.WEIGHT_KG,
      durationMinutes,
    })

    if (caloriesBurned > 0) {
      const newTotalCalories = (clientData.totalCalories || 0) + caloriesBurned
      hrmDataRepository.update(clientId, {
        totalCalories: newTotalCalories,
      })
      logger.info({ clientId, caloriesBurned, newTotal: newTotalCalories }, 'Calories updated.')
    }

    // Reset samples for the next interval
    session.hrSamples = []
  }
}
