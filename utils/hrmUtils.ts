// File: utils/hrmUtils.ts
/**
 * Utility functions for processing and analyzing heart rate monitoring (HRM) data.
 */
import { HrmDataPoint } from '../services/hrmDataService'

/**
 * Calculates summary statistics (average, max, min) for a given set of HRM data.
 * @param data - An array of HRM data points.
 * @returns An object with avg, max, and min heart rate values.
 */
export const calculateSummaryStatistics = (data: HrmDataPoint[]) => {
  if (data.length === 0) {
    return { avg: 0, max: 0, min: 0 }
  }

  const hrmValues = data.map((d) => d.hrm)
  const max = Math.max(...hrmValues)
  const min = Math.min(...hrmValues)
  const avg = Math.round(hrmValues.reduce((a, b) => a + b, 0) / hrmValues.length)

  return { avg, max, min }
}
