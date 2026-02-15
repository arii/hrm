// File: lib/shared/hr-zones.ts
/**
 * Shared constants and types for Heart Rate (HR) zones to ensure consistency
 * across different modules (domain logic, UI, etc.).
 */
import { HR_COLORS } from '@/lib/shared/colors'

export const MAX_HR_DEFAULT = 185

/**
 * Enum for HR Zone names to provide compile-time safety and prevent string mismatches.
 */
export enum HrZoneName {
  Idle = 'Idle',
  Recovery = 'Recovery',
  WarmUp = 'Warm Up',
  Aerobic = 'Aerobic',
  Cardio = 'Cardio',
  Peak = 'Peak',
  // Legacy/Internal names for compatibility
  FatBurn = 'Fat Burn',
  Max = 'Max',
  NoData = 'No Data',
  Unknown = 'Unknown',
}

/**
 * Heart Rate Zone string literal type for consistency and full type safety.
 * Replaces HrZoneName enum and numeric indices in modern code.
 */
export type HeartRateZone =
  | 'ZONE_0'
  | 'ZONE_1'
  | 'ZONE_2'
  | 'ZONE_3'
  | 'ZONE_4'
  | 'ZONE_5'
  | 'ZONE_6'

/**
 * Thresholds for HR zones (percentage of Max HR).
 */
export const ZONE_THRESHOLDS = {
  ZONE_6: 95,
  ZONE_5: 90,
  ZONE_4: 80,
  ZONE_3: 70,
  ZONE_2: 60,
  ZONE_1: 50,
} as const

/**
 * Estimates a user's maximum heart rate using the Haskell & Fox formula (220 - age).
 *
 * NOTE: While the Tanaka formula (208 - 0.7 * age) is often more accurate for older adults,
 * we are using the Haskell & Fox formula here to ensure parity with existing dashboard
 * calculation logic and requested test cases (e.g. 120-year-old athlete).
 *
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
 * Canonical visual configuration for heart rate zones.
 * Shared between client (Connect/Mock) and Dashboard (HrTile).
 * color: Background color for the zone.
 * textColor: Text color for optimal contrast (forcing specific overrides).
 *
 * NOTE: Colors are imported from shared constants to maintain consistency
 * between shared logic and the MUI theme.
 */
export const HR_ZONE_VISUAL_CONFIG = {
  6: {
    color: HR_COLORS.ZONE_6_MAX,
    label: HrZoneName.Max,
    textColor: HR_COLORS.TEXT_LIGHT,
  },
  5: {
    color: HR_COLORS.ZONE_5_PEAK,
    label: HrZoneName.Peak,
    textColor: HR_COLORS.TEXT_LIGHT,
  },
  4: {
    color: HR_COLORS.ZONE_4_CARDIO,
    label: HrZoneName.Cardio,
    textColor: HR_COLORS.TEXT_LIGHT,
  },
  3: {
    color: HR_COLORS.ZONE_3_FATBURN,
    label: HrZoneName.FatBurn,
    textColor: HR_COLORS.TEXT_LIGHT,
  },
  2: {
    color: HR_COLORS.ZONE_2_WARMUP,
    label: HrZoneName.WarmUp,
    textColor: HR_COLORS.TEXT_LIGHT,
  },
  1: {
    color: HR_COLORS.ZONE_1_RECOVERY,
    label: HrZoneName.Recovery,
    textColor: HR_COLORS.TEXT_DARK,
  },
  0: {
    color: HR_COLORS.ZONE_0_IDLE,
    label: HrZoneName.Idle,
    textColor: HR_COLORS.TEXT_DARK,
  },
} as const

/**
 * Pre-calculated order of zone labels for sorting purposes (highest intensity first).
 */
export const HR_ZONE_ORDER = Object.values(HR_ZONE_VISUAL_CONFIG)
  .map((config) => config.label as string)
  .reverse()

/**
 * Pre-calculated map of zone labels to their corresponding hex colors.
 */
export const HR_ZONE_COLOR_MAP: Record<string, string> = Object.values(
  HR_ZONE_VISUAL_CONFIG
).reduce((acc, config) => ({ ...acc, [config.label]: config.color }), {
  [HrZoneName.NoData]: '#e0e0e0',
  [HrZoneName.Unknown]: '#9e9e9e',
} as Record<string, string>)

/**
 * Calculates the percentage of max HR and the corresponding zone (0-5) based on Max HR.
 * @param currentHr - Current heart rate in BPM.
 * @param maxHr - Max Heart Rate.
 * @returns An object containing the calculated percentage and zone.
 */
export const calculateZoneFromMaxHr = (
  currentHr: number,
  maxHr: number
): { percentage: number; zone: number } => {
  const percentage =
    maxHr > 0 && currentHr > 0
      ? Math.min(100, Math.round((currentHr / maxHr) * 100))
      : 0

  let zone = 0
  if (percentage >= ZONE_THRESHOLDS.ZONE_6) zone = 6
  else if (percentage >= ZONE_THRESHOLDS.ZONE_5) zone = 5
  else if (percentage >= ZONE_THRESHOLDS.ZONE_4) zone = 4
  else if (percentage >= ZONE_THRESHOLDS.ZONE_3) zone = 3
  else if (percentage >= ZONE_THRESHOLDS.ZONE_2) zone = 2
  else if (percentage >= ZONE_THRESHOLDS.ZONE_1) zone = 1

  return { percentage, zone }
}

/**
 * Calculates the percentage of max HR and the corresponding zone (0-5).
 * @param currentHr - Current heart rate in BPM.
 * @param age - User's age.
 * @returns An object containing the calculated percentage and zone.
 */
export const calculateHrZoneInfo = (
  currentHr: number,
  age?: number | string | null
): { percentage: number; zone: number } => {
  const maxHr = calculateMaxHr(age)
  return calculateZoneFromMaxHr(currentHr, maxHr)
}

/**
 * Gets the string label for a numeric zone.
 * @param zone - Numeric zone (0-5).
 * @returns Human-readable label.
 */
export const getHrZoneLabel = (zone: number): string => {
  return (
    HR_ZONE_VISUAL_CONFIG[zone as keyof typeof HR_ZONE_VISUAL_CONFIG]?.label ||
    'Idle'
  )
}

/**
 * Interface for HR zone configuration used in UI components.
 */
export interface HeartRateZoneConfig {
  name: string
  minPercent: number
  maxPercent: number
  color: string
}

/**
 * Canonical list of heart rate zones with their percentage ranges and colors.
 * This is the single source of truth for zone definitions.
 */
export const HEART_RATE_ZONES: HeartRateZoneConfig[] = [
  {
    name: 'Zone 6',
    minPercent: ZONE_THRESHOLDS.ZONE_6,
    maxPercent: 100,
    color: HR_ZONE_VISUAL_CONFIG[6].color,
  },
  {
    name: 'Zone 5',
    minPercent: ZONE_THRESHOLDS.ZONE_5,
    maxPercent: ZONE_THRESHOLDS.ZONE_6,
    color: HR_ZONE_VISUAL_CONFIG[5].color,
  },
  {
    name: 'Zone 4',
    minPercent: ZONE_THRESHOLDS.ZONE_4,
    maxPercent: ZONE_THRESHOLDS.ZONE_5,
    color: HR_ZONE_VISUAL_CONFIG[4].color,
  },
  {
    name: 'Zone 3',
    minPercent: ZONE_THRESHOLDS.ZONE_3,
    maxPercent: ZONE_THRESHOLDS.ZONE_4,
    color: HR_ZONE_VISUAL_CONFIG[3].color,
  },
  {
    name: 'Zone 2',
    minPercent: ZONE_THRESHOLDS.ZONE_2,
    maxPercent: ZONE_THRESHOLDS.ZONE_3,
    color: HR_ZONE_VISUAL_CONFIG[2].color,
  },
  {
    name: 'Zone 1',
    minPercent: ZONE_THRESHOLDS.ZONE_1,
    maxPercent: ZONE_THRESHOLDS.ZONE_2,
    color: HR_ZONE_VISUAL_CONFIG[1].color,
  },
]

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
