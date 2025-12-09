// services/LegacyAdapter.ts
import fs from 'fs/promises'
import path from 'path'
import { WorkoutSession, WorkoutPhase } from '@/types/data-models'
import { v5 as uuidv5 } from 'uuid'

// Namespace for deterministic IDs (do not change this)
const UUID_NAMESPACE = '1b671a64-40d5-491e-99b0-da01ff1f3341'

// Path to your mounted JSON file
// Ensure docker-compose.yml mounts: ./previous_workouts:/usr/src/previous_workouts
const DATA_PATH =
  '/usr/src/previous_workouts/exercise_data/workout_history_data_categorized.json'

interface LegacyJSON {
  daily_workouts: {
    [date: string]: Array<{
      date: string
      filename: string
      phases: {
        phase: string
        exercises: string[]
      }[]
    }>
  }
}

class LegacyAdapter {
  private cache: WorkoutSession[] | null = null

  public async getSessions(): Promise<WorkoutSession[]> {
    // Basic caching to avoid reading disk on every request
    // In dev, you might want to remove this to see updates instantly
    if (this.cache && process.env.NODE_ENV === 'production') return this.cache

    try {
      // Check if file exists to avoid crashing
      try {
        await fs.access(DATA_PATH)
      } catch {
        console.warn(`[LegacyAdapter] Data file not found at ${DATA_PATH}`)
        return []
      }

      const fileContent = await fs.readFile(DATA_PATH, 'utf-8')
      const data: LegacyJSON = JSON.parse(fileContent)
      const sessions: WorkoutSession[] = []

      // Flatten the daily_workouts structure
      Object.values(data.daily_workouts)
        .flat()
        .forEach((entry) => {
          // Generate stable ID from the filename
          const id = uuidv5(entry.filename, UUID_NAMESPACE)

          const phases: WorkoutPhase[] = entry.phases.map((p) => ({
            name: p.phase,
            exercises: p.exercises,
          }))

          sessions.push({
            id,
            userId: 'default-user',
            startedAt: new Date(entry.date).toISOString(),
            endedAt: null, // Legacy workouts imply "finished", but timestamp is vague
            source: 'legacy_import',
            duration: 0,
            avgHr: 0,
            calories: 0,
            phases,
            notes: `Imported revision: ${entry.filename}`,
            samples: [],
          })
        })

      // Sort: Newest first
      this.cache = sessions.sort(
        (a, b) =>
          new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
      )

      console.log(
        `[LegacyAdapter] Loaded ${this.cache.length} legacy sessions.`
      )
      return this.cache
    } catch (error) {
      console.error('[LegacyAdapter] Failed to load legacy history:', error)
      return []
    }
  }
}

export const legacyAdapter = new LegacyAdapter()
