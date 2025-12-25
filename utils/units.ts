export type UnitSystem = 'metric' | 'imperial';

/**
 * Converts kilograms to pounds.
 * @param kg - The weight in kilograms.
 * @returns The weight in pounds.
 */
export const kgToLbs = (kg: number): number => kg * 2.20462;

/**
 * Converts pounds to kilograms.
 * @param lbs - The weight in pounds.
 * @returns The weight in kilograms.
 */
export const lbsToKg = (lbs: number): number => lbs / 2.20462;
