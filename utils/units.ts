// File: utils/units.ts
import { UnitSystem } from '@/types/core'

/**
 * Conversion factor from kilograms to pounds.
 * @type {number}
 */
const KG_TO_LBS_FACTOR = 2.20462

/**
 * Converts kilograms to pounds.
 *
 * @param {number} kg - The weight in kilograms.
 * @returns {number} The weight in pounds.
 */
export const kgToLbs = (kg: number): number => kg * KG_TO_LBS_FACTOR

/**
 * Converts pounds to kilograms.
 *
 * @param {number} lbs - The weight in pounds.
 * @returns {number} The weight in kilograms.
 */
export const lbsToKg = (lbs: number): number => lbs / KG_TO_LBS_FACTOR

/**
 * Formats a weight value based on the selected unit system.
 *
 * @param {number} weightInKg - The weight in kilograms.
 * @param {UnitSystem} unitSystem - The target unit system ('METRIC' or 'IMPERIAL').
 * @param {object} [options] - Formatting options.
 * @param {boolean} [options.includeUnit=true] - Whether to include the unit suffix (e.g., "kg" or "lbs").
 * @returns {string} The formatted weight string.
 */
export const formatWeight = (
  weightInKg: number,
  unitSystem: UnitSystem,
  options: { includeUnit?: boolean } = {}
): string => {
  const { includeUnit = true } = options
  let value: number
  let unit: string

  if (unitSystem === 'IMPERIAL') {
    value = kgToLbs(weightInKg)
    unit = 'lbs'
  } else {
    value = weightInKg
    unit = 'kg'
  }

  const roundedValue = Math.round(value)

  return includeUnit ? `${roundedValue} ${unit}` : roundedValue.toString()
}
