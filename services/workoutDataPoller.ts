// File: services/workoutDataPoller.ts
/**
 * Polls the Google Doc for changes and uses a callback to broadcast updates.
 */
import { parseGoogleDocTable, WorkoutItem } from './googleDocParser.js'
import { broadcast } from '../utils/broadcast.js'
import { getGoogleDocWorkoutUrl } from '../utils/urls.js'
import logger from '../utils/logger'

// A simple in-memory cache to store the last known state of the workout data.
let lastKnownData: string | null = null

const pollWorkoutData = async (): Promise<void> => {
  const url = getGoogleDocWorkoutUrl()
  if (!url) {
    logger.warn('GOOGLE_DOC_WORKOUT_URL is not set. Skipping workout data polling.')
    return
  }

  try {
    const workoutItems: WorkoutItem[] | null = await parseGoogleDocTable(url)
    if (workoutItems) {
      const currentData = JSON.stringify(workoutItems)
      if (lastKnownData !== currentData) {
        lastKnownData = currentData
        broadcast({
          type: 'WORKOUT_DATA_UPDATE',
          payload: workoutItems,
        })
        logger.info('Workout data has changed. Broadcasted update.')
      }
    }
  } catch (error) {
    logger.error('Error polling workout data:', error)
  }
}

const startPolling = (interval: number = 60000): NodeJS.Timeout => {
  logger.info(`Starting workout data polling every ${interval}ms.`)
  // Poll immediately on start, then set the interval.
  pollWorkoutData()
  return setInterval(pollWorkoutData, interval)
}

export { startPolling }
