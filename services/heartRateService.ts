// File: services/heartRateService.ts
/**
 * @file HeartRateService class for processing and analyzing heart rate data.
 */

import { RawHeartRateData, HeartRateAnalytics, HeartRateZoneData } from '../types';
import { getHrZoneProps } from '../utils/visualization';

class HeartRateService {
  private rawData: RawHeartRateData[] = [];

  /**
   * Adds a new heart rate data point.
   * @param value The heart rate value (BPM).
   */
  public addData(value: number): void {
    this.rawData.push({
      value,
      timestamp: Date.now(),
    });
  }

  /**
   * Processes the collected raw data to generate analytics.
   * @param maxHr The user's maximum heart rate.
   * @returns HeartRateAnalytics object or null if not enough data.
   */
  public getAnalytics(maxHr: number): HeartRateAnalytics | null {
    if (this.rawData.length < 2) {
      return null; // Not enough data to process
    }

    const values = this.rawData.map(d => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const average = Math.round(values.reduce((sum, val) => sum + val, 0) / values.length);

    const zones: { [key: string]: number } = {};

    for (let i = 1; i < this.rawData.length; i++) {
      const previous = this.rawData[i - 1];
      const current = this.rawData[i];
      const durationSeconds = (current.timestamp - previous.timestamp) / 1000;

      // Use the midpoint HR value for zone calculation over the interval
      const midHr = (previous.value + current.value) / 2;
      const zoneProps = getHrZoneProps(midHr, maxHr);
      const zoneName = zoneProps.zone;

      if (zones[zoneName]) {
        zones[zoneName] += durationSeconds;
      } else {
        zones[zoneName] = durationSeconds;
      }
    }

    const zoneData: HeartRateZoneData[] = Object.entries(zones).map(([zone, time]) => ({
      zone,
      time: Math.round(time),
    }));

    return {
      min,
      max,
      average,
      zones: zoneData,
    };
  }

  /**
   * Clears all collected heart rate data.
   */
  public reset(): void {
    this.rawData = [];
  }
}

export default HeartRateService;
