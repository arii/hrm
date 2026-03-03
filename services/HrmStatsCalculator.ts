import {
  HrmInternalStats,
  HrmSessionStats,
  RawHrmStreamData,
  HrmStreamData,
} from '../types/core'

/**
 * Service for calculating heart rate statistics incrementally.
 * Encapsulates the logic for updating counters and deriving human-readable stats.
 */
export class HrmStatsCalculator {
  /**
   * Creates a new initial stats object with default values.
   * @returns A fresh HrmInternalStats object.
   */
  createInitialStats(): HrmInternalStats {
    return {
      count: 0,
      sumHr: 0,
      peakHr: 0,
      minHr: Infinity,
    }
  }

  /**
   * Updates the internal stats with a new heart rate value.
   * Performs O(1) incremental updates to avoid re-calculating from history.
   * @param stats The current internal stats (modified in-place).
   * @param heartRate The new heart rate value to incorporate.
   */
  updateStats(stats: HrmInternalStats, heartRate: number): void {
    stats.count++
    stats.sumHr += heartRate
    stats.peakHr = Math.max(stats.peakHr, heartRate)
    stats.minHr = Math.min(stats.minHr, heartRate)
  }

  /**
   * Calculates derived statistics from the internal counters.
   * @param stats The internal stats.
   * @returns Human-readable session statistics.
   */
  getDerivedStats(stats: HrmInternalStats): HrmSessionStats {
    const hasData = stats.count > 0
    return {
      avgHr: hasData ? Math.round(stats.sumHr / stats.count) : 0,
      peakHr: stats.peakHr,
      minHr: hasData ? stats.minHr : 0,
    }
  }

  /**
   * Merges raw stream data with session statistics.
   * Helper method to augment real-time data with calculated session metrics.
   * @param latestData The latest raw heart rate data.
   * @param stats The internal stats.
   * @returns The augmented HrmStreamData object.
   */
  mergeStats(
    latestData: RawHrmStreamData,
    stats: HrmInternalStats
  ): HrmStreamData {
    return {
      ...latestData,
      sessionStats: this.getDerivedStats(stats),
    }
  }
}
