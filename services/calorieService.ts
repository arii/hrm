// File: services/calorieService.ts
import { HrmDataRepository } from '../lib/repositories/HrmDataRepository.js'
import { estimateCaloriesBurned } from '../lib/calorie-estimation.js'
import { USER_AGE_DEFAULT, USER_WEIGHT_DEFAULT_KG } from '../utils/constants.js'
import logger from '../utils/logger.js'

let calorieUpdateInterval: NodeJS.Timeout | undefined

const clientSessionState = new Map<
  string,
  { lastUpdate: number; hrSamples: number[] }
>()

const updateCaloriesForClient = (
  clientId: string,
  hrmDataRepository: HrmDataRepository
): boolean => {
  const session = clientSessionState.get(clientId)
  const clientData = hrmDataRepository.findById(clientId)

  if (!session || !clientData || session.hrSamples.length === 0) {
    return false
  }

  const now = Date.now()
  const avgHr =
    session.hrSamples.reduce((sum, val) => sum + val, 0) /
    session.hrSamples.length

  let caloriesUpdated = false
  if (avgHr > 30) {
    try {
      const durationMinutes = (now - session.lastUpdate) / 1000 / 60
      // Prevent calculating for excessively long durations if the system clock changes.
      if (durationMinutes > 0 && durationMinutes < 5) {
        const caloriesBurned = estimateCaloriesBurned({
          heartRate: avgHr,
          age: clientData.age ?? USER_AGE_DEFAULT,
          weightKg: clientData.weightKg ?? USER_WEIGHT_DEFAULT_KG,
          durationMinutes: durationMinutes,
        })

        if (caloriesBurned > 0) {
          const currentTotal = clientData.totalCalories ?? 0
          hrmDataRepository.save({
            ...clientData,
            totalCalories:
              Math.round((currentTotal + caloriesBurned) * 10) / 10,
          })
          caloriesUpdated = true
        }
      }
    } catch (error) {
      logger.error({ clientId, error }, 'Failed to estimate calories burned')
    }
  }

  // Clear hrSamples for next interval
  session.hrSamples = []
  session.lastUpdate = now

  return caloriesUpdated
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
