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
