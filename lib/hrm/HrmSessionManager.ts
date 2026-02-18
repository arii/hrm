// lib/hrm/HrmSessionManager.ts
import { RingBuffer } from '@/lib/structures/RingBuffer'
import {
  HrmStreamData,
  RawHrmStreamData,
  HeartRateDataPoint,
  HrmInternalStats,
} from '@/types/core'
import { env } from '@/lib/env'
import { HrmStatsCalculator } from '@/services/HrmStatsCalculator'

type HrmDataPoint = Pick<HeartRateDataPoint, 'heartRate' | 'timestamp'>

/**
 * Internal session state for a single HRM client.
 * Combines the latest streamed data with a fixed-capacity history
 * and incrementally updated statistics to prevent O(N) calculations.
 */
interface ClientSession {
  latestData: RawHrmStreamData
  liveWindow: RingBuffer<HrmDataPoint>
  stats: HrmInternalStats
  /**
   * Caches the augmented HrmStreamData (latest data + session stats).
   * This prevents repeated object allocations during high-frequency reads.
   * Invalidation occurs in save() when new data arrives and in resetSession().
   */
  cachedAugmentedData?: HrmStreamData
}

const LIVE_WINDOW_SIZE = env.HRM_LIVE_WINDOW_SIZE // 10 minutes at 1Hz (default)

/**
 * Manages HRM client sessions, including history tracking and incremental statistics.
 * Encapsulates storage, retrieval, and analysis of heart rate data streams.
 */
export class HrmSessionManager {
  private sessions = new Map<string, ClientSession>()
  private statsCalculator = new HrmStatsCalculator()

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
        stats: this.statsCalculator.createInitialStats(),
      }
      this.sessions.set(data.clientId, session)
    }

    session.latestData = data
    session.cachedAugmentedData = undefined

    // Only update history and stats if we have a valid HR value
    if (data.value > 0) {
      const point: HrmDataPoint = {
        heartRate: data.value,
        timestamp: data.updatedAt || Date.now(),
      }
      session.liveWindow.push(point)
      this.statsCalculator.updateStats(session.stats, point.heartRate)
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

    const derived = this.statsCalculator.getDerivedStats(session.stats)
    return {
      recentHistory: session.liveWindow.toArray(),
      summary: {
        ...derived,
        count: session.stats.count,
      },
    }
  }

  /**
   * Resets history, statistics, and the current value for a client session.
   * @param clientId The client's unique identifier.
   */
  resetSession(clientId: string): void {
    const session = this.sessions.get(clientId)
    if (session) {
      session.liveWindow = new RingBuffer<HrmDataPoint>(LIVE_WINDOW_SIZE)
      session.stats = this.statsCalculator.createInitialStats()
      // Reset the current HR value to 0 to prevent UI "ghosting"
      session.latestData = {
        ...session.latestData,
        value: 0,
        updatedAt: Date.now(),
      }
      session.cachedAugmentedData = undefined
    }
  }

  private mergeStats(session: ClientSession): HrmStreamData {
    if (session.cachedAugmentedData) {
      return session.cachedAugmentedData
    }

    const augmented = this.statsCalculator.mergeStats(
      session.latestData,
      session.stats
    )

    session.cachedAugmentedData = augmented
    return augmented
  }
}
