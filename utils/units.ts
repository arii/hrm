// utils/units.ts

import { MeasurementSystem } from '../types/core'

export const KG_TO_LBS = 2.20462

export const toKg = (value: number, system: MeasurementSystem): number => {
  if (system === 'IMPERIAL') {
    return value / KG_TO_LBS
  }
  return value
}

export const toDisplay = (
  kgValue: number,
  system: MeasurementSystem
): number => {
  const displayValue = system === 'IMPERIAL' ? kgValue * KG_TO_LBS : kgValue
  return parseFloat(displayValue.toFixed(1))
}

export const INCH_TO_CM = 2.54
export const FEET_TO_INCHES = 12

export const feetAndInchesToCm = (feet: number, inches: number): number => {
  const totalInches = feet * FEET_TO_INCHES + inches
  return totalInches * INCH_TO_CM
}

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

/**
 * Formats duration for HRM glanceability.
 * Prioritizes minutes/seconds and handles overflow.
 */
export const formatZoneDuration = (seconds: number): string => {
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  return hrs > 0
    ? `${hrs}h ${mins}m ${secs}s`
    : `${mins}:${secs.toString().padStart(2, '0')}`
}
