// File: utils/units.ts
/**
 * Utility functions for unit conversions and formatting.
 */

export type UnitSystem = 'metric' | 'imperial'

export const KG_TO_LBS = 2.20462
export const LBS_TO_KG = 1 / KG_TO_LBS

export const kgToLbs = (kg: number): number => kg * KG_TO_LBS
export const lbsToKg = (lbs: number): number => lbs * LBS_TO_KG

export const formatWeight = (
  weight: number,
  unitSystem: UnitSystem
): string => {
  if (unitSystem === 'imperial') {
    return `${Math.round(kgToLbs(weight))} lbs`
  }
  return `${Math.round(weight)} kg`
}
