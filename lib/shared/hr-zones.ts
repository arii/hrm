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
  Resting = 'Resting',
  WarmUp = 'Warm-up',
  FatBurn = 'Fat Burn',
  Cardio = 'Cardio',
  Peak = 'Peak',
  Max = 'Max',
  NoData = 'No Data',
  Unknown = 'Unknown',
}

/**
 * Minimum percentage thresholds for each heart rate zone (0.0 - 1.0).
 */
export const ZONE_THRESHOLDS: Partial<Record<HrZoneName, number>> = {
  [HrZoneName.Resting]: 0,
  [HrZoneName.WarmUp]: 0.5,
  [HrZoneName.FatBurn]: 0.6,
  [HrZoneName.Cardio]: 0.7,
  [HrZoneName.Peak]: 0.85,
  [HrZoneName.Max]: 0.95,
}

/**
 * Visual configuration for Heart Rate Zones.
 * Single Source of Truth for colors.
 */
export const HR_ZONE_VISUAL_CONFIG: Record<
  HrZoneName,
  { color: string; textColor: string }
> = {
  [HrZoneName.Resting]: { color: '#607d8b', textColor: '#ffffff' },
  [HrZoneName.WarmUp]: { color: '#3498db', textColor: '#ffffff' },
  [HrZoneName.FatBurn]: { color: '#2ecc71', textColor: '#ffffff' },
  [HrZoneName.Cardio]: { color: '#f1c40f', textColor: '#ffffff' },
  [HrZoneName.Peak]: { color: '#e67e22', textColor: '#ffffff' },
  [HrZoneName.Max]: { color: '#e74c3c', textColor: '#ffffff' },
  [HrZoneName.NoData]: { color: '#9e9e9e', textColor: '#ffffff' },
  [HrZoneName.Unknown]: { color: '#9e9e9e', textColor: '#ffffff' },
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
    warmUp: { min: calculateZoneBPM(ZONE_THRESHOLDS[HrZoneName.WarmUp]!) },
    fatBurn: { min: calculateZoneBPM(ZONE_THRESHOLDS[HrZoneName.FatBurn]!) },
    cardio: { min: calculateZoneBPM(ZONE_THRESHOLDS[HrZoneName.Cardio]!) },
    peak: { min: calculateZoneBPM(ZONE_THRESHOLDS[HrZoneName.Peak]!) },
    max: { min: calculateZoneBPM(ZONE_THRESHOLDS[HrZoneName.Max]!) },
  }
}

// Helper type for return value
export interface HrZoneInfo {
  zoneName: HrZoneName
  percentage: number
  bpm: number
}

/**
 * Calculates the current heart rate zone, and percentage of max HR.
 * @param {number} currentHr - The current heart rate in beats per minute.
 * @param {number} maxHr - The user's maximum heart rate.
 * @returns {HrZoneInfo} An object containing the zone name, percentage of max HR, and current BPM.
 */
export const calculateZoneFromMaxHr = (
  currentHr: number,
  maxHr: number
): HrZoneInfo => {
  if (!maxHr || !currentHr || currentHr <= 0) {
    return {
      zoneName: HrZoneName.NoData,
      percentage: 0,
      bpm: 0,
    }
  }

  const percentageOfMax = Math.min(100, Math.round((currentHr / maxHr) * 100))
  let zoneName = HrZoneName.Resting

  if (percentageOfMax >= ZONE_THRESHOLDS[HrZoneName.Max]! * 100)
    zoneName = HrZoneName.Max
  else if (percentageOfMax >= ZONE_THRESHOLDS[HrZoneName.Peak]! * 100)
    zoneName = HrZoneName.Peak
  else if (percentageOfMax >= ZONE_THRESHOLDS[HrZoneName.Cardio]! * 100)
    zoneName = HrZoneName.Cardio
  else if (percentageOfMax >= ZONE_THRESHOLDS[HrZoneName.FatBurn]! * 100)
    zoneName = HrZoneName.FatBurn
  else if (percentageOfMax >= ZONE_THRESHOLDS[HrZoneName.WarmUp]! * 100)
    zoneName = HrZoneName.WarmUp

  return {
    zoneName,
    percentage: percentageOfMax,
    bpm: currentHr,
  }
}
