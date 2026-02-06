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

  return Math.round(208 - 0.7 * ageNum)
}

export const ZONE_THRESHOLDS = {
  [HrZoneName.Resting]: 0,
  [HrZoneName.WarmUp]: 0.5,
  [HrZoneName.FatBurn]: 0.6,
  [HrZoneName.Cardio]: 0.7,
  [HrZoneName.Peak]: 0.85,
  [HrZoneName.Max]: 0.95,
}

export interface HrZoneVisualConfig {
  color: string
  textColor: string
}

export const HR_ZONE_VISUAL_CONFIG: Record<HrZoneName, HrZoneVisualConfig> = {
  [HrZoneName.Resting]: { color: '#9E9E9E', textColor: '#FFFFFF' },
  [HrZoneName.WarmUp]: { color: '#2196F3', textColor: '#FFFFFF' },
  [HrZoneName.FatBurn]: { color: '#4CAF50', textColor: '#FFFFFF' },
  [HrZoneName.Cardio]: { color: '#FFEB3B', textColor: '#000000' },
  [HrZoneName.Peak]: { color: '#F44336', textColor: '#FFFFFF' },
  [HrZoneName.Max]: { color: '#9C27B0', textColor: '#FFFFFF' },
  [HrZoneName.NoData]: { color: '#B0BEC5', textColor: '#FFFFFF' },
  [HrZoneName.Unknown]: { color: '#9E9E9E', textColor: '#FFFFFF' },
}

export type HrZoneInfo = {
  zoneName: HrZoneName
  percentage: number
  bpm: number
}

// Define a type for the return value for clarity
export type UserHrZones = {
  warmUp: { min: number }
  fatBurn: { min: number }
  cardio: { min: number }
  peak: { min: number }
  max: { min: number }
}

export const getZoneFromPercentage = (percentage: number): HrZoneName => {
  const ratio = percentage / 100
  if (ratio >= ZONE_THRESHOLDS[HrZoneName.Max]) return HrZoneName.Max
  if (ratio >= ZONE_THRESHOLDS[HrZoneName.Peak]) return HrZoneName.Peak
  if (ratio >= ZONE_THRESHOLDS[HrZoneName.Cardio]) return HrZoneName.Cardio
  if (ratio >= ZONE_THRESHOLDS[HrZoneName.FatBurn]) return HrZoneName.FatBurn
  if (ratio >= ZONE_THRESHOLDS[HrZoneName.WarmUp]) return HrZoneName.WarmUp
  return HrZoneName.Resting
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

  const percentage = Math.min(100, Math.round((currentHr / maxHr) * 100))
  const zoneName = getZoneFromPercentage(percentage)

  return {
    zoneName,
    percentage,
    bpm: currentHr,
  }
}
