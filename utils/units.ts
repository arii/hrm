// utils/units.ts

import { MeasurementSystem } from '../types'

export const KG_TO_LBS = 2.20462

/**
 * Converts a value to kilograms based on the measurement system.
 * @param value The value to convert.
 * @param system The measurement system of the value.
 * @returns The value in kilograms.
 */
export const toKg = (value: number, system: MeasurementSystem): number => {
  if (system === 'IMPERIAL') {
    return value / KG_TO_LBS
  }
  return value
}

/**
 * Converts a kilogram value to the display value based on the measurement system.
 * @param kgValue The value in kilograms.
 * @param system The target measurement system.
 * @returns The display value, rounded to one decimal place.
 */
export const toDisplay = (
  kgValue: number,
  system: MeasurementSystem
): number => {
  const displayValue = system === 'IMPERIAL' ? kgValue * KG_TO_LBS : kgValue
  return parseFloat(displayValue.toFixed(1))
}

export const INCH_TO_CM = 2.54
export const FEET_TO_INCHES = 12

/**
 * Converts height in feet and inches to centimeters.
 * @param feet The number of feet.
 * @param inches The number of inches.
 * @returns The height in centimeters.
 */
export const feetAndInchesToCm = (feet: number, inches: number): number => {
  const totalInches = feet * FEET_TO_INCHES + inches
  return totalInches * INCH_TO_CM
}

/**
 * Converts height in centimeters to feet and inches.
 * @param cm The height in centimeters.
 * @returns An object with feet and inches.
 */
export const cmToFeetAndInches = (
  cm: number
): { feet: number; inches: number } => {
  if (isNaN(cm) || cm < 0) {
    return { feet: 0, inches: 0 }
  }
  const totalInches = cm / INCH_TO_CM
  const feet = Math.floor(totalInches / FEET_TO_INCHES)
  const inches = Math.round(totalInches % FEET_TO_INCHES)
  return { feet, inches }
}
