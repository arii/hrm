import { MeasurementSystem } from '@/types'

/**
 * Constants
 */
export const KG_TO_LBS = 2.20462

/**
 * Converts a value to kilograms based on the measurement system.
 *
 * @param value - The value to convert.
 * @param system - The measurement system of the value.
 * @returns The value converted to kilograms.
 */
export const toKg = (value: number, system: MeasurementSystem): number => {
  if (system === 'IMPERIAL') {
    return value / KG_TO_LBS
  }
  return value
}

/**
 * Converts a kilogram value to the display value based on the measurement system.
 *
 * @param kgValue - The value in kilograms.
 * @param system - The measurement system to display in.
 * @returns The value converted to the display system, rounded to 1 decimal place.
 */
export const toDisplay = (
  kgValue: number,
  system: MeasurementSystem
): number => {
  let displayValue: number
  if (system === 'IMPERIAL') {
    displayValue = kgValue * KG_TO_LBS
  } else {
    displayValue = kgValue
  }
  // Round to 1 decimal place
  return Math.round(displayValue * 10) / 10
}
