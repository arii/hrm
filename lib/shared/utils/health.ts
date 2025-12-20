/**
 * @file This file contains utility functions related to health and fitness calculations.
 * @module lib/shared/utils/health
 */

/**
 * Calculates the estimated maximum heart rate based on age.
 *
 * This function uses the simple formula (220 - age). If the age is not provided
 * or is invalid, it returns a default value of 190.
 *
 * @param {number | string | null | undefined} age - The user's age.
 * @returns {number} The estimated maximum heart rate.
 * @example
 * calculateMaxHr(30)      // 190
 * calculateMaxHr("25")    // 195
 * calculateMaxHr(null)    // 190
 */
export const calculateMaxHr = (age: number | string | null | undefined): number => {
  if (age) {
    const ageAsNumber = typeof age === 'string' ? parseInt(age, 10) : age;
    if (!isNaN(ageAsNumber) && ageAsNumber > 0) {
      return 220 - ageAsNumber;
    }
  }
  return 190;
};
