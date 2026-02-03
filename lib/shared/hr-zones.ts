// File: lib/shared/hr-zones.ts
/**
 * Shared constants and types for Heart Rate (HR) zones to ensure consistency
 * across different modules (domain logic, UI, etc.).
 */
// Default Max HR set to 190 to align with standard baseline setup for unconfigured profiles.
export const MAX_HR_DEFAULT = 190

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

  return 208 - 0.7 * ageNum
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

export const calculateHrZone = (
  currentHr: number,
  maxHr: number
): { zoneName: HrZoneName; percentage: number; bpm: number } => {
  const percentage = maxHr > 0 ? Math.round((currentHr / maxHr) * 100) : 0
  const bpm = currentHr
  let zoneName: HrZoneName

  if (currentHr <= 0) {
    zoneName = HrZoneName.NoData
  } else if (percentage < 60) {
    zoneName = HrZoneName.WarmUp
  } else if (percentage < 70) {
    zoneName = HrZoneName.FatBurn
  } else if (percentage < 85) {
    zoneName = HrZoneName.Cardio
  } else if (percentage < 95) {
    zoneName = HrZoneName.Peak
  } else {
    zoneName = HrZoneName.Max
  }

  return { zoneName, percentage, bpm }
}
