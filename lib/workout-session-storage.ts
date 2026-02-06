// lib/workout-session-storage.ts

import { openDB, DBSchema, IDBPDatabase } from 'idb'
import { HrZoneName } from './shared/hr-zones'
import { calculateHrZone } from './hrm/zones'

// --- TypeScript Interfaces ---

export { HrZoneName }

export interface HrDataPoint {
  time: number
  hr: number
}

export interface CalorieDataPoint {
  time: number
  hr: number
  caloriesPerSecond: number
  totalToThisPoint: number
}

export interface WorkoutSessionData {
  sessionId: string
  startTime: number
  endTime: number | null
  status: 'idle' | 'running' | 'paused' | 'finished'
  hrHistory: HrDataPoint[]
  timeInZones: Record<HrZoneName, number>
  averageHr: number
  maxHr: number
  calorieHistory: CalorieDataPoint[]
  totalCaloriesBurned: number
  userSettings: { age: number; weight: number; maxHr: number }
  lastSyncTime: number
  syncStatus: 'pending' | 'synced' | 'failed'
}

interface WorkoutDB extends DBSchema {
  sessions: {
    key: string
    value: WorkoutSessionData
    indexes: { status: string }
  }
}

// --- Constants ---

const DB_NAME = 'WorkoutSessionDB'
const DB_VERSION = 1
const STORE_NAME = 'sessions'

// --- WorkoutSessionStorage Class ---

/**
 * Manages persistent storage of workout session data using IndexedDB with localStorage fallback.
 *
 * **Storage Strategy:**
 * - Primary: IndexedDB for larger data sets and better performance
 * - Fallback: localStorage when IndexedDB is unavailable (e.g., private browsing)
 *
 * **Error Handling:**
 * - All operations gracefully degrade to localStorage on IndexedDB failures
 * - Storage quota exceeded errors are caught and logged
 * - Corrupted data is handled with validation and fallback mechanisms
 *
 * @example
 * ```typescript
 * const storage = new WorkoutSessionStorage()
 * await storage.saveSession(sessionData)
 * const session = await storage.getSession(sessionId)
 * ```
 */
export class WorkoutSessionStorage {
  private dbPromise: Promise<IDBPDatabase<WorkoutDB>> | null = null
  private isIndexedDBSupported: boolean
  private localStorageKeyPrefix = 'workout-session-'
  private localStorageIndexKey = 'workout-sessions-index'

  constructor() {
    this.isIndexedDBSupported =
      typeof window !== 'undefined' && !!window.indexedDB
    if (this.isIndexedDBSupported) {
      this.dbPromise = openDB<WorkoutDB>(DB_NAME, DB_VERSION, {
        upgrade(db) {
          const store = db.createObjectStore(STORE_NAME, {
            keyPath: 'sessionId',
          })
          store.createIndex('status', 'status')
        },
      }).catch((error) => {
        console.error('Failed to initialize IndexedDB:', error)
        return null
      }) as Promise<IDBPDatabase<WorkoutDB>>
    }
  }

  private getLocalStorageIndex(): string[] {
    const indexStr = localStorage.getItem(this.localStorageIndexKey)
    return indexStr ? JSON.parse(indexStr) : []
  }

  /**
   * Executes an IndexedDB operation with automatic localStorage fallback.
   */
  private async withFallback<T>(
    operation: string,
    idbOperation: (db: IDBPDatabase<WorkoutDB>) => Promise<T>,
    localStorageOperation: () => T
  ): Promise<T> {
    try {
      if (this.isIndexedDBSupported && this.dbPromise) {
        const db = await this.dbPromise
        if (db) {
          return await idbOperation(db)
        }
      }
    } catch (error) {
      console.warn(
        `IndexedDB ${operation} failed, falling back to localStorage:`,
        error
      )
    }
    return localStorageOperation()
  }

  private updateSessionWithHrData(
    session: WorkoutSessionData,
    dataPoints: HrDataPoint[]
  ): WorkoutSessionData {
    const newHrHistory = [...session.hrHistory]
    const newTimeInZones = { ...session.timeInZones }
    let newMaxHr = session.maxHr
    let currentAverageHr = session.averageHr
    let currentCount = session.hrHistory.length

    for (const point of dataPoints) {
      const lastPoint =
        newHrHistory.length > 0 ? newHrHistory[newHrHistory.length - 1] : null
      const timeDelta = lastPoint ? (point.time - lastPoint.time) / 1000 : 1

      const { zoneName } = calculateHrZone(point.hr, session.userSettings.maxHr)
      newTimeInZones[zoneName] = (newTimeInZones[zoneName] || 0) + timeDelta

      newMaxHr = Math.max(newMaxHr, point.hr)
      currentAverageHr =
        (currentAverageHr * currentCount + point.hr) / (currentCount + 1)
      currentCount++

      newHrHistory.push(point)
    }

    return {
      ...session,
      hrHistory: newHrHistory,
      timeInZones: newTimeInZones,
      maxHr: newMaxHr,
      averageHr: currentAverageHr,
    }
  }

  /**
   * Saves a workout session to persistent storage.
   *
   * @param session - The workout session data to save
   * @throws {Error} If both IndexedDB and localStorage fail (e.g., quota exceeded)
   */
  public async saveSession(session: WorkoutSessionData): Promise<void> {
    await this.withFallback(
      'save',
      async (db) => {
        await db.put(STORE_NAME, session)
      },
      () => {
        const index = this.getLocalStorageIndex()
        if (!index.includes(session.sessionId)) {
          index.push(session.sessionId)
          localStorage.setItem(this.localStorageIndexKey, JSON.stringify(index))
        }
        localStorage.setItem(
          this.localStorageKeyPrefix + session.sessionId,
          JSON.stringify(session)
        )
      }
    )
  }

  /**
   * Appends heart rate data points to an active session in a transaction-safe manner.
   * This updates the history, time-in-zones, max HR, and average HR.
   */
  public async appendHrData(
    sessionId: string,
    dataPoints: HrDataPoint[]
  ): Promise<void> {
    // TODO: Refactor this to use a separate ObjectStore for HrDataPoints keyed by sessionId (one-to-many relationship)
    // instead of embedding a massive array inside the Session object.
    // This current implementation reads/writes the full session object which is O(N) and inefficient for long workouts.
    if (dataPoints.length === 0) return

    await this.withFallback(
      'appendHrData',
      async (db) => {
        const tx = db.transaction(STORE_NAME, 'readwrite')
        const store = tx.store
        const session = await store.get(sessionId)

        if (session) {
          const updatedSession = this.updateSessionWithHrData(
            session,
            dataPoints
          )
          await store.put(updatedSession)
        }
        await tx.done
      },
      () => {
        try {
          const sessionStr = localStorage.getItem(
            this.localStorageKeyPrefix + sessionId
          )
          if (!sessionStr) return

          const session: WorkoutSessionData = JSON.parse(sessionStr)
          const updatedSession = this.updateSessionWithHrData(
            session,
            dataPoints
          )

          localStorage.setItem(
            this.localStorageKeyPrefix + sessionId,
            JSON.stringify(updatedSession)
          )
        } catch (error) {
          console.error('Failed to append HR data in localStorage:', error)
        }
      }
    )
  }

  /**
   * Retrieves a specific workout session by ID.
   *
   * @param sessionId - The unique identifier of the session
   * @returns The workout session data, or null if not found
   */
  public async getSession(
    sessionId: string
  ): Promise<WorkoutSessionData | null> {
    return this.withFallback(
      'get',
      async (db) => {
        const session = await db.get(STORE_NAME, sessionId)
        return session || null
      },
      () => {
        try {
          const sessionStr = localStorage.getItem(
            this.localStorageKeyPrefix + sessionId
          )
          return sessionStr ? JSON.parse(sessionStr) : null
        } catch (error) {
          console.error('Failed to retrieve session from localStorage:', error)
          return null
        }
      }
    )
  }

  /**
   * Retrieves all workout sessions from storage.
   *
   * @returns Array of all stored workout sessions
   */
  public async getAllSessions(): Promise<WorkoutSessionData[]> {
    return this.withFallback(
      'getAll',
      async (db) => db.getAll(STORE_NAME),
      () => {
        try {
          const index = this.getLocalStorageIndex()
          return index
            .map((id) => {
              try {
                const sessionStr = localStorage.getItem(
                  this.localStorageKeyPrefix + id
                )
                return sessionStr ? JSON.parse(sessionStr) : null
              } catch (parseError) {
                console.warn(`Failed to parse session ${id}:`, parseError)
                return null
              }
            })
            .filter(
              (session): session is WorkoutSessionData => session !== null
            )
        } catch (error) {
          console.error('Failed to retrieve sessions from localStorage:', error)
          return []
        }
      }
    )
  }

  /**
   * Deletes a workout session from storage.
   *
   * @param sessionId - The unique identifier of the session to delete
   */
  public async deleteSession(sessionId: string): Promise<void> {
    await this.withFallback(
      'delete',
      async (db) => {
        await db.delete(STORE_NAME, sessionId)
      },
      () => {
        try {
          const index = this.getLocalStorageIndex()
          const newIndex = index.filter((id) => id !== sessionId)
          localStorage.setItem(
            this.localStorageIndexKey,
            JSON.stringify(newIndex)
          )
          localStorage.removeItem(this.localStorageKeyPrefix + sessionId)
        } catch (error) {
          console.error('Failed to delete session from localStorage:', error)
        }
      }
    )
  }

  /**
   * Finds and returns any incomplete session (running or paused).
   *
   * @returns The first incomplete session found, or null if none exist
   */
  public async getIncompleteSession(): Promise<WorkoutSessionData | null> {
    return this.withFallback(
      'getIncomplete',
      async (db) => {
        const tx = db.transaction(STORE_NAME, 'readonly')
        const index = tx.store.index('status')
        const runningSession = await index.get('running')
        if (runningSession) {
          return runningSession
        }
        const pausedSession = await index.get('paused')
        return pausedSession || null
      },
      () => {
        try {
          const allSessions = this.getLocalStorageIndex()
            .map((id) => {
              try {
                const sessionStr = localStorage.getItem(
                  this.localStorageKeyPrefix + id
                )
                return sessionStr ? JSON.parse(sessionStr) : null
              } catch {
                return null
              }
            })
            .filter(
              (session): session is WorkoutSessionData => session !== null
            )
          const runningSession = allSessions.find((s) => s.status === 'running')
          if (runningSession) return runningSession
          const pausedSession = allSessions.find((s) => s.status === 'paused')
          return pausedSession || null
        } catch (error) {
          console.error(
            'Failed to get incomplete session from localStorage:',
            error
          )
          return null
        }
      }
    )
  }
}

// Export a singleton instance
export const workoutSessionStorage = new WorkoutSessionStorage()
