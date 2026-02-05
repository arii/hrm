// File: lib/shared/hr-zones.ts
/**
 * Shared constants and types for Heart Rate (HR) zones to ensure consistency
 * across different modules (domain logic, UI, etc.).
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

  return 220 - ageNum
}

export const HR_ZONE_VISUAL_CONFIG = {
  5: { color: '#ff0000', label: 'Peak' },
  4: { color: '#ff8000', label: 'Cardio' },
  3: { color: '#ffff00', label: 'Aerobic' },
  2: { color: '#00ff00', label: 'Warm Up' },
  1: { color: '#00ffff', label: 'Recovery' },
  0: { color: '#cccccc', label: 'Idle' },
} as const

/**
 * Calculates the percentage of max HR and the corresponding zone (0-5).
 * @param currentHr - Current heart rate in BPM.
 * @param age - User's age.
 * @returns An object containing the calculated percentage and zone.
 */
export const calculateHrZoneInfo = (
  currentHr: number,
  age: number
): { percentage: number; zone: number } => {
  const maxHr = calculateMaxHr(age)
  const percentage =
    currentHr > 0 ? Math.min(100, Math.round((currentHr / maxHr) * 100)) : 0

  let zone = 0
  if (percentage >= 90) zone = 5
  else if (percentage >= 80) zone = 4
  else if (percentage >= 70) zone = 3
  else if (percentage >= 60) zone = 2
  else if (percentage >= 50) zone = 1

  return { percentage, zone }
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
