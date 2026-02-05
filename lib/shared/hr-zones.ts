/**
 * Shared constants, types, and domain logic for Heart Rate (HR) zones.
 * This module serves as the Single Source of Truth (SSOT) for HR calculations
 * and definitions, ensuring consistency across the application.
 */

export const MAX_HR_DEFAULT = 185

/**
 * Enum for HR Zone names to provide compile-time safety and prevent string mismatches.
 */
export enum HrZoneName {
  WarmUp = 'Warm-up',
  FatBurn = 'Fat Burn',
  Cardio = 'Cardio',
  Peak = 'Peak',
  Max = 'Max',
  NoData = 'No Data',
  Unknown = 'Unknown',
}

/**
 * Interface representing a calculated heart rate zone status.
 */
export interface HrZone {
  zoneName: HrZoneName
  percentage: number
  bpm: number
}

// Heart Rate Zone Boundaries (as percentage of Max HR)
export const HR_ZONE_DEFINITIONS = [
  { name: HrZoneName.WarmUp, min: 0.5 },
  { name: HrZoneName.FatBurn, min: 0.6 },
  { name: HrZoneName.Cardio, min: 0.7 },
  { name: HrZoneName.Peak, min: 0.85 },
  { name: HrZoneName.Max, min: 0.95 },
]

/**
 * Estimates a user's maximum heart rate using the Tanaka formula.
 * @param age - The user's age in years.
 * @returns The estimated maximum heart rate.
 */
export const calculateMaxHr = (age?: number | string | null): number => {
  if (!age) return MAX_HR_DEFAULT

  const ageNum = typeof age === 'string' ? parseInt(age, 10) : age

  if (isNaN(ageNum) || ageNum <= 0) {
    return MAX_HR_DEFAULT
  }

  return 208 - 0.7 * ageNum
}

/**
 * Calculates the current heart rate zone, and percentage of max HR.
 * @param {number} currentHr - The current heart rate in beats per minute.
 * @param {number} maxHr - The user's maximum heart rate.
 * @returns {HrZone} An object containing the zone name, percentage of max HR, and current BPM.
 */
export const calculateHrZone = (currentHr: number, maxHr: number): HrZone => {
  if (!maxHr || !currentHr || currentHr <= 0) {
    return {
      zoneName: HrZoneName.NoData,
      percentage: 0,
      bpm: 0,
    }
  }

  const percentageOfMax = Math.min(100, Math.round((currentHr / maxHr) * 100))
  let calculatedZone = HR_ZONE_DEFINITIONS[0]!

  // Iterate backwards to find the correct zone
  for (let i = HR_ZONE_DEFINITIONS.length - 1; i >= 0; i--) {
    const hrZone = HR_ZONE_DEFINITIONS[i]
    if (hrZone && percentageOfMax / 100 >= hrZone.min) {
      calculatedZone = hrZone
      break
    }
  }

  return {
    zoneName: calculatedZone.name,
    percentage: percentageOfMax,
    bpm: currentHr,
  }
}

// Define a type for the return value for clarity
export type UserHrZones = {
  warmUp: { min: number }
  fatBurn: { min: number }
  cardio: { min: number }
  peak: { min: number }
  max: { min: number }
}

export const getUserHrZones = (age: number): UserHrZones => {
  const maxHr = calculateMaxHr(age)
  const calculateZoneBPM = (percentage: number) =>
    Math.round(maxHr * percentage)

  return {
    warmUp: { min: calculateZoneBPM(0.5) },
    fatBurn: { min: calculateZoneBPM(0.6) },
    cardio: { min: calculateZoneBPM(0.7) },
    peak: { min: calculateZoneBPM(0.85) },
    max: { min: calculateZoneBPM(0.95) },
  }
}
