// utils/units.ts

import { MeasurementSystem } from '../types'

export const KG_TO_LBS = 2.20462

/**
 * Converts kilograms to pounds.
 * @param kg The weight in kilograms.
 * @returns The weight in pounds.
 */
export const kgToLbs = (kg: number): number => {
  return kg * KG_TO_LBS
}

/**
 * Converts pounds to kilograms.
 * @param lbs The weight in pounds.
 * @returns The weight in kilograms.
 */
export const lbsToKg = (lbs: number): number => {
  return lbs / KG_TO_LBS
}

/**
 * Converts a value to kilograms based on the measurement system.
 * @param value The value to convert.
 * @param system The measurement system of the value.
 * @returns The value in kilograms.
 */
export const toKg = (value: number, system: MeasurementSystem): number => {
  if (system === 'IMPERIAL') {
    return lbsToKg(value)
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
  const displayValue = system === 'IMPERIAL' ? kgToLbs(kgValue) : kgValue
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
  return Math.round(totalInches * INCH_TO_CM)
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
  const roundedTotalInches = Math.round(totalInches)
  const feet = Math.floor(roundedTotalInches / FEET_TO_INCHES)
  const inches = roundedTotalInches % FEET_TO_INCHES
  return { feet, inches }
}
