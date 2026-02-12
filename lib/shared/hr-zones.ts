// File: lib/shared/hr-zones.ts
/**
 * Shared constants and types for Heart Rate (HR) zones to ensure consistency
 * across different modules (domain logic, UI, etc.).
 */
import { HR_COLORS } from '@/lib/shared/colors'

export const MAX_HR_DEFAULT = 185

// Define the canonical HeartRateZone type
export type HeartRateZone =
  | 'ZONE_0'
  | 'ZONE_1'
  | 'ZONE_2'
  | 'ZONE_3'
  | 'ZONE_4'
  | 'ZONE_5'
  | 'ZONE_6'
  | 'NO_DATA'
  | 'UNKNOWN'

export interface ZoneDetail {
  label: string
  minPercent: number
  maxPercent: number
  color: string
  textColor: string
}

/**
 * Canonical configuration for heart rate zones.
 * This is the single source of truth for zone definitions, thresholds, and visuals.
 */
export const HR_ZONE_CONFIG: Record<HeartRateZone, ZoneDetail> = {
  ZONE_6: {
    label: 'Maximum',
    minPercent: 95,
    maxPercent: 100,
    color: HR_COLORS.ZONE_6_MAX,
    textColor: HR_COLORS.TEXT_LIGHT,
  },
  ZONE_5: {
    label: 'Anaerobic',
    minPercent: 90,
    maxPercent: 95,
    color: HR_COLORS.ZONE_5_PEAK,
    textColor: HR_COLORS.TEXT_LIGHT,
  },
  ZONE_4: {
    label: 'Threshold',
    minPercent: 80,
    maxPercent: 90,
    color: HR_COLORS.ZONE_4_CARDIO,
    textColor: HR_COLORS.TEXT_LIGHT,
  },
  ZONE_3: {
    label: 'Aerobic',
    minPercent: 70,
    maxPercent: 80,
    color: HR_COLORS.ZONE_3_FATBURN,
    textColor: HR_COLORS.TEXT_LIGHT,
  },
  ZONE_2: {
    label: 'Easy',
    minPercent: 60,
    maxPercent: 70,
    color: HR_COLORS.ZONE_2_WARMUP,
    textColor: HR_COLORS.TEXT_LIGHT,
  },
  ZONE_1: {
    label: 'Warm Up',
    minPercent: 50,
    maxPercent: 60,
    color: HR_COLORS.ZONE_1_RECOVERY,
    textColor: HR_COLORS.TEXT_DARK,
  },
  ZONE_0: {
    label: 'Idle',
    minPercent: 0,
    maxPercent: 50,
    color: HR_COLORS.ZONE_0_IDLE,
    textColor: HR_COLORS.TEXT_DARK,
  },
  NO_DATA: {
    label: 'No Data',
    minPercent: 0,
    maxPercent: 0,
    color: HR_COLORS.ZONE_0_IDLE,
    textColor: HR_COLORS.TEXT_DARK,
  },
  UNKNOWN: {
    label: 'Unknown',
    minPercent: 0,
    maxPercent: 0,
    color: HR_COLORS.ZONE_0_IDLE,
    textColor: HR_COLORS.TEXT_DARK,
  },
}

// Keep ZONE_THRESHOLDS for internal logic if needed
export const ZONE_THRESHOLDS = {
  ZONE_6: HR_ZONE_CONFIG.ZONE_6.minPercent,
  ZONE_5: HR_ZONE_CONFIG.ZONE_5.minPercent,
  ZONE_4: HR_ZONE_CONFIG.ZONE_4.minPercent,
  ZONE_3: HR_ZONE_CONFIG.ZONE_3.minPercent,
  ZONE_2: HR_ZONE_CONFIG.ZONE_2.minPercent,
  ZONE_1: HR_ZONE_CONFIG.ZONE_1.minPercent,
} as const

/**
 * Estimates a user's maximum heart rate using the Haskell & Fox formula (220 - age).
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

/**
 * Calculates the percentage of max HR and the corresponding zone based on Max HR.
 * @param currentHr - Current heart rate in BPM.
 * @param maxHr - Max Heart Rate.
 * @returns An object containing the calculated percentage and zone key.
 */
export const calculateZoneFromMaxHr = (
  currentHr: number,
  maxHr: number
): { percentage: number; zone: HeartRateZone } => {
  const percentage =
    maxHr > 0 && currentHr > 0
      ? Math.min(100, Math.round((currentHr / maxHr) * 100))
      : 0

  let zone: HeartRateZone = 'ZONE_0'
  if (percentage >= ZONE_THRESHOLDS.ZONE_6) zone = 'ZONE_6'
  else if (percentage >= ZONE_THRESHOLDS.ZONE_5) zone = 'ZONE_5'
  else if (percentage >= ZONE_THRESHOLDS.ZONE_4) zone = 'ZONE_4'
  else if (percentage >= ZONE_THRESHOLDS.ZONE_3) zone = 'ZONE_3'
  else if (percentage >= ZONE_THRESHOLDS.ZONE_2) zone = 'ZONE_2'
  else if (percentage >= ZONE_THRESHOLDS.ZONE_1) zone = 'ZONE_1'

  return { percentage, zone }
}

/**
 * Calculates the percentage of max HR and the corresponding zone.
 * @param currentHr - Current heart rate in BPM.
 * @param age - User's age.
 * @returns An object containing the calculated percentage and zone key.
 */
export const calculateHrZoneInfo = (
  currentHr: number,
  age?: number | string | null
): { percentage: number; zone: HeartRateZone } => {
  const maxHr = calculateMaxHr(age)
  return calculateZoneFromMaxHr(currentHr, maxHr)
}

/**
 * Gets the string label for a zone key.
 * @param zone - Zone key.
 * @returns Human-readable label.
 */
export const getHrZoneLabel = (zone: HeartRateZone): string => {
  return HR_ZONE_CONFIG[zone]?.label || 'Idle'
}

// UserHrZones type remains for legacy support or usage in getUserHrZones
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
