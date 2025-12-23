// lib/repositories/WorkoutSessionRepository.ts
import { WorkoutSession } from '../../types/workout'
import fs from 'fs/promises'
import path from 'path'

const DB_PATH = path.resolve(process.cwd(), 'logs', 'workouts.json')

/**
 * Repository for managing workout sessions.
 * Encapsulates the storage and retrieval of WorkoutSession data.
 */
export class WorkoutSessionRepository {
  private sessions: WorkoutSession[] = []
  private initializationPromise: Promise<void> | null = null

  constructor() {
    this.initializationPromise = this.initialize()
  }

  private async initialize(): Promise<void> {
    try {
      await fs.mkdir(path.dirname(DB_PATH), { recursive: true })
      const data = await fs.readFile(DB_PATH, 'utf-8')
      this.sessions = JSON.parse(data)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        this.sessions = []
      } else {
        console.error('Failed to load workout sessions:', error)
      }
    }
  }

  private async saveSessions(): Promise<void> {
    try {
      await fs.writeFile(DB_PATH, JSON.stringify(this.sessions, null, 2))
    } catch (error) {
      console.error('Failed to save workout sessions:', error)
    }
  }

  /**
   * Finds a session by its ID.
   * @param id The session's unique identifier.
   * @returns The session or undefined if not found.
   */
  async findById(id: string): Promise<WorkoutSession | undefined> {
    await this.initializationPromise
    return this.sessions.find((session) => session.id === id)
  }

  /**
   * Retrieves all workout sessions.
   * @returns An array of all workout sessions.
   */
  async findAll(): Promise<WorkoutSession[]> {
    await this.initializationPromise
    return this.sessions
  }

  /**
   * Saves or updates a workout session.
   * @param session The session data to save.
   */
  async save(session: WorkoutSession): Promise<void> {
    await this.initializationPromise
    const index = this.sessions.findIndex((s) => s.id === session.id)
    if (index !== -1) {
      this.sessions[index] = session
    } else {
      this.sessions.push(session)
    }
    await this.saveSessions()
  }
}
