/**
 * @file Heart rate zone calculations.
 */

/**
 * Calculates the heart rate zone based on the current heart rate and maximum heart rate.
 *
 * @param {number} hr The current heart rate.
 * @param {number} maxHr The maximum heart rate.
 * @returns {number} The heart rate zone (1-5).
 */
export const calculateHrZone = (hr: number, maxHr: number): number => {
  if (maxHr <= 0) {
    return 1 // Return lowest zone if maxHr is invalid to prevent division by zero
  }
  const percentage = (hr / maxHr) * 100
  if (percentage < 60) {
    return 1
  } else if (percentage < 70) {
    return 2
  } else if (percentage < 80) {
    return 3
  } else if (percentage < 90) {
    return 4
  } else {
    return 5
  }
}
