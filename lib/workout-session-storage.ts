// lib/workout-session-storage.ts

import { openDB, DBSchema, IDBPDatabase } from 'idb'
import { HrZoneName } from './shared/hr-zones'

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
      })
    }
  }

  private getLocalStorageIndex(): string[] {
    const indexStr = localStorage.getItem(this.localStorageIndexKey)
    return indexStr ? JSON.parse(indexStr) : []
  }

  public async saveSession(session: WorkoutSessionData): Promise<void> {
    if (this.isIndexedDBSupported && this.dbPromise) {
      const db = await this.dbPromise
      await db.put(STORE_NAME, session)
    } else {
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
  }

  public async getSession(
    sessionId: string
  ): Promise<WorkoutSessionData | null> {
    if (this.isIndexedDBSupported && this.dbPromise) {
      const db = await this.dbPromise
      const session = await db.get(STORE_NAME, sessionId)
      return session || null
    } else {
      const sessionStr = localStorage.getItem(
        this.localStorageKeyPrefix + sessionId
      )
      return sessionStr ? JSON.parse(sessionStr) : null
    }
  }

  public async getAllSessions(): Promise<WorkoutSessionData[]> {
    if (this.isIndexedDBSupported && this.dbPromise) {
      const db = await this.dbPromise
      return db.getAll(STORE_NAME)
    } else {
      const index = this.getLocalStorageIndex()
      return index
        .map((id) =>
          JSON.parse(
            localStorage.getItem(this.localStorageKeyPrefix + id) || 'null'
          )
        )
        .filter(Boolean)
    }
  }

  public async deleteSession(sessionId: string): Promise<void> {
    if (this.isIndexedDBSupported && this.dbPromise) {
      const db = await this.dbPromise
      await db.delete(STORE_NAME, sessionId)
    } else {
      const index = this.getLocalStorageIndex()
      const newIndex = index.filter((id) => id !== sessionId)
      localStorage.setItem(this.localStorageIndexKey, JSON.stringify(newIndex))
      localStorage.removeItem(this.localStorageKeyPrefix + sessionId)
    }
  }

  public async getIncompleteSession(): Promise<WorkoutSessionData | null> {
    if (this.isIndexedDBSupported && this.dbPromise) {
      const db = await this.dbPromise
      const tx = db.transaction(STORE_NAME, 'readonly')
      const index = tx.store.index('status')
      const runningSession = await index.get('running')
      if (runningSession) {
        return runningSession
      }
      const pausedSession = await index.get('paused')
      return pausedSession || null
    } else {
      const allSessions = await this.getAllSessions()
      const runningSession = allSessions.find((s) => s.status === 'running')
      if (runningSession) return runningSession
      const pausedSession = allSessions.find((s) => s.status === 'paused')
      return pausedSession || null
    }
  }
}

// Export a singleton instance
export const workoutSessionStorage = new WorkoutSessionStorage()
