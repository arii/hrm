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

export const CM_TO_IN = 0.393701

/**
 * Converts a value to centimeters based on the measurement system.
 * @param value The value to convert.
 * @param system The measurement system of the value (assumes inches for IMPERIAL).
 * @returns The value in centimeters.
 */
export const toCm = (value: number, system: MeasurementSystem): number => {
  if (system === 'IMPERIAL') {
    return value / CM_TO_IN
  }
  return value
}

/**
 * Converts a centimeter value to the display value (inches or cm).
 * @param cmValue The value in centimeters.
 * @param system The target measurement system.
 * @returns The display value, rounded to one decimal place.
 */
export const toDisplayHeight = (
  cmValue: number,
  system: MeasurementSystem
): number => {
  const displayValue = system === 'IMPERIAL' ? cmValue * CM_TO_IN : cmValue
  return parseFloat(displayValue.toFixed(1))
}
