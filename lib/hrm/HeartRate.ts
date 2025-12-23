// File: lib/hrm/HeartRate.ts
/**
 * A Value Object representing a Heart Rate.
 */

export class HeartRate {
  private readonly value: number

  constructor(value: number) {
    if (value < 0 || value > 300) {
      throw new Error('Heart rate must be between 0 and 300.')
    }
    this.value = value
  }

  /**
   * Returns the heart rate as a primitive number.
   * @returns {number} The heart rate value.
   */
  public getValue(): number {
    return this.value
  }

  /**
   * Calculates the percentage of this heart rate relative to a maximum heart rate.
   * @param {HeartRate} max - The maximum heart rate.
   * @returns {number} The percentage of the maximum heart rate.
   */
  public percentageOf(max: HeartRate): number {
    if (max.getValue() === 0) {
      return 0 // Avoid division by zero
    }
    return Math.min(100, Math.round((this.value / max.getValue()) * 100))
  }
}
