export type UnitSystem = 'metric' | 'imperial'

/**
 * Converts kilograms to pounds.
 * @param kg - The weight in kilograms.
 * @returns The weight in pounds, or null if the input is invalid.
 */
export const kgToLbs = (kg: number | null | undefined): number | null => {
  if (kg === null || kg === undefined) return null
  return kg * 2.20462
}

/**
 * Converts pounds to kilograms.
 * @param lbs - The weight in pounds.
 * @returns The weight in kilograms, or null if the input is invalid.
 */
export const lbsToKg = (lbs: number | null | undefined): number | null => {
  if (lbs === null || lbs === undefined) return null
  return lbs / 2.20462
}
