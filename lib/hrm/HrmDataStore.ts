// lib/hrm/HrmDataStore.ts
import { RingBuffer } from '../structures/RingBuffer.js'
import {
  HrmStreamData,
  RawHrmStreamData,
  HeartRateDataPoint,
} from '../../types/core.js'
import { env } from '../env.js'

type HrmDataPoint = Pick<HeartRateDataPoint, 'heartRate' | 'timestamp'>

/**
 * Internal session state for a single HRM client.
 * Combines the latest streamed data with a fixed-capacity history
 * and incrementally updated statistics to prevent O(N) calculations.
 */
interface ClientSession {
  latestData: RawHrmStreamData
  liveWindow: RingBuffer<HrmDataPoint>
  stats: {
    count: number
    sumHr: number
    maxHr: number
    minHr: number
  }
}

const LIVE_WINDOW_SIZE = env.HRM_LIVE_WINDOW_SIZE // 10 minutes at 1Hz (default)

/**
 * DataStore for managing HRM client data.
 * Encapsulates the storage and retrieval of HrmStreamData with integrated
 * memory management via Ring Buffers.
 */
export class HrmDataStore {
  private sessions = new Map<string, ClientSession>()

  /**
   * Finds a client's data by their ID, including aggregated session stats.
   * @param id The client's unique identifier.
   * @returns The client's data or undefined if not found.
   */
  findById(id: string): HrmStreamData | undefined {
    const session = this.sessions.get(id)
    if (!session) return undefined

    return this.mergeStats(session)
  }

  /**
   * Retrieves all client data entries with aggregated session stats.
   * @returns An array of all client data.
   */
  findAll(): HrmStreamData[] {
    return Array.from(this.sessions.values()).map((session) =>
      this.mergeStats(session)
    )
  }

  /**
   * Saves or updates a client's data and adds a point to their history.
   * @param data The client data to save.
   */
  save(data: RawHrmStreamData): void {
    let session = this.sessions.get(data.clientId)

    if (!session) {
      session = {
        latestData: data,
        liveWindow: new RingBuffer<HrmDataPoint>(LIVE_WINDOW_SIZE),
        stats: {
          count: 0,
          sumHr: 0,
          maxHr: 0,
          minHr: Infinity,
        },
      }
      this.sessions.set(data.clientId, session)
    }

    session.latestData = data

    // Only update history and stats if we have a valid HR value
    if (data.value > 0) {
      const point: HrmDataPoint = {
        heartRate: data.value,
        timestamp: data.updatedAt || Date.now(),
      }
      session.liveWindow.push(point)
      this.updateStats(session, point.heartRate)
    }
  }

  /**
   * Deletes a client's data by their ID.
   * @param id The client's unique identifier.
   */
  deleteById(id: string): void {
    this.sessions.delete(id)
  }

  /**
   * Clears all client data from the repository.
   */
  clear(): void {
    this.sessions.clear()
  }

  /**
   * Returns a snapshot of history and stats for a client.
   * Useful for initial state hydration or deep analysis.
   * @param clientId The client's unique identifier.
   */
  getSnapshot(clientId: string) {
    const session = this.sessions.get(clientId)
    if (!session) return null

    return {
      recentHistory: session.liveWindow.toArray(),
      summary: {
        avgHr:
          session.stats.count > 0
            ? Math.round(session.stats.sumHr / session.stats.count)
            : 0,
        maxHr: session.stats.maxHr,
        minHr: session.stats.count > 0 ? session.stats.minHr : 0,
        count: session.stats.count,
      },
    }
  }

  /**
   * Prunes the history buffer for a client to free up memory.
   * Note: This does not persist data; ensure it is saved elsewhere if needed.
   * @param clientId The client's unique identifier.
   */
  pruneSessionHistory(clientId: string): void {
    const session = this.sessions.get(clientId)
    if (session) {
      session.liveWindow.clear()
      // We keep the stats as they represent the session-to-date
    }
  }

  /**
   * Resets both history and statistics for a client session.
   * @param clientId The client's unique identifier.
   */
  resetSession(clientId: string): void {
    const session = this.sessions.get(clientId)
    if (session) {
      session.liveWindow.clear()
      session.stats = {
        count: 0,
        sumHr: 0,
        maxHr: 0,
        minHr: Infinity,
      }
    }
  }

  private updateStats(session: ClientSession, heartRate: number): void {
    const { stats } = session
    stats.count++
    stats.sumHr += heartRate
    stats.maxHr = Math.max(stats.maxHr, heartRate)
    stats.minHr = Math.min(stats.minHr, heartRate)
  }

  private mergeStats(session: ClientSession): HrmStreamData {
    const { latestData, stats } = session
    return {
      ...latestData,
      sessionStats: {
        avgHr: stats.count > 0 ? Math.round(stats.sumHr / stats.count) : 0,
        maxHr: stats.maxHr,
        minHr: stats.count > 0 ? stats.minHr : 0,
      },
    }
  }
}
