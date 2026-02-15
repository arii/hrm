// File: lib/shared/hr-zones.ts
/**
 * Shared constants and types for Heart Rate (HR) zones to ensure consistency
 * across different modules (domain logic, UI, etc.).
 */
import { HR_COLORS } from '@/lib/shared/colors'

export const MAX_HR_DEFAULT = 185

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
 * Canonical configuration for heart rate zones.
 * Single source of truth for labels, thresholds, and colors.
 */
export const HR_ZONE_CONFIG: Record<
  HeartRateZone,
  {
    label: string
    threshold: number
    color: string
    textColor: string
    zoneNumber: number
  }
> = {
  ZONE_6: {
    label: 'Max',
    threshold: 95,
    color: HR_COLORS.ZONE_6_MAX,
    textColor: HR_COLORS.TEXT_LIGHT,
    zoneNumber: 6,
  },
  ZONE_5: {
    label: 'Peak',
    threshold: 90,
    color: HR_COLORS.ZONE_5_PEAK,
    textColor: HR_COLORS.TEXT_LIGHT,
    zoneNumber: 5,
  },
  ZONE_4: {
    label: 'Cardio',
    threshold: 80,
    color: HR_COLORS.ZONE_4_CARDIO,
    textColor: HR_COLORS.TEXT_LIGHT,
    zoneNumber: 4,
  },
  ZONE_3: {
    label: 'Fat Burn',
    threshold: 70,
    color: HR_COLORS.ZONE_3_FATBURN,
    textColor: HR_COLORS.TEXT_LIGHT,
    zoneNumber: 3,
  },
  ZONE_2: {
    label: 'Warm Up',
    threshold: 60,
    color: HR_COLORS.ZONE_2_WARMUP,
    textColor: HR_COLORS.TEXT_LIGHT,
    zoneNumber: 2,
  },
  ZONE_1: {
    label: 'Recovery',
    threshold: 50,
    color: HR_COLORS.ZONE_1_RECOVERY,
    textColor: HR_COLORS.TEXT_DARK,
    zoneNumber: 1,
  },
  ZONE_0: {
    label: 'Idle',
    threshold: 0,
    color: HR_COLORS.ZONE_0_IDLE,
    textColor: HR_COLORS.TEXT_DARK,
    zoneNumber: 0,
  },
}

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
 * Pre-calculated order of zone labels for sorting purposes (highest intensity first).
 */
export const HR_ZONE_ORDER = (
  Object.keys(HR_ZONE_CONFIG) as HeartRateZone[]
).sort((a, b) => HR_ZONE_CONFIG[b].zoneNumber - HR_ZONE_CONFIG[a].zoneNumber)

/**
 * Pre-calculated map of zone labels to their corresponding hex colors.
 */
export const HR_ZONE_COLOR_MAP: Record<string, string> = Object.entries(
  HR_ZONE_CONFIG
).reduce((acc, [_, config]) => ({ ...acc, [config.label]: config.color }), {
  'No Data': '#e0e0e0',
  Unknown: '#9e9e9e',
} as Record<string, string>)

/**
 * Calculates the percentage of max HR and the corresponding zone (0-6) based on Max HR.
 * @param currentHr - Current heart rate in BPM.
 * @param maxHr - Max Heart Rate.
 * @returns An object containing the calculated percentage and zone number.
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
  if (percentage >= HR_ZONE_CONFIG.ZONE_6.threshold) zone = 6
  else if (percentage >= HR_ZONE_CONFIG.ZONE_5.threshold) zone = 5
  else if (percentage >= HR_ZONE_CONFIG.ZONE_4.threshold) zone = 4
  else if (percentage >= HR_ZONE_CONFIG.ZONE_3.threshold) zone = 3
  else if (percentage >= HR_ZONE_CONFIG.ZONE_2.threshold) zone = 2
  else if (percentage >= HR_ZONE_CONFIG.ZONE_1.threshold) zone = 1

  return { percentage, zone }
}

/**
 * Calculates the heart rate zone information.
 * @param currentHr - Current heart rate in BPM.
 * @param maxHr - Max Heart Rate.
 * @returns An object containing the zone name, percentage, and BPM.
 */
export const calculateHeartRateZone = (
  currentHr: number,
  maxHr: number
): { zoneName: HeartRateZone; percentage: number; bpm: number } => {
  if (!maxHr || !currentHr || currentHr <= 0) {
    return {
      zoneName: 'ZONE_0',
      percentage: 0,
      bpm: 0,
    }
  }

  const { percentage, zone } = calculateZoneFromMaxHr(currentHr, maxHr)

  return {
    zoneName: `ZONE_${zone}` as HeartRateZone,
    percentage,
    bpm: currentHr,
  }
}

/**
 * Calculates the percentage of max HR and the corresponding zone info.
 * @param currentHr - Current heart rate in BPM.
 * @param age - User's age.
 * @returns An object containing the calculated percentage and zone number.
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
 * @param zone - Numeric zone (0-6).
 * @returns Human-readable label.
 */
export const getHrZoneLabel = (zone: number): string => {
  const key = `ZONE_${zone}` as HeartRateZone
  return HR_ZONE_CONFIG[key]?.label || 'Idle'
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
 * Canonical list of heart rate zones for UI components.
 * Derived from HR_ZONE_CONFIG to ensure single source of truth.
 */
export const HEART_RATE_ZONES: HeartRateZoneConfig[] = HR_ZONE_ORDER.filter(
  (z) => z !== 'ZONE_0'
).map((z) => ({
  name: `Zone ${HR_ZONE_CONFIG[z].zoneNumber}`,
  minPercent: HR_ZONE_CONFIG[z].threshold,
  maxPercent:
    z === 'ZONE_6'
      ? 100
      : HR_ZONE_CONFIG[
          `ZONE_${HR_ZONE_CONFIG[z].zoneNumber + 1}` as HeartRateZone
        ].threshold,
  color: HR_ZONE_CONFIG[z].color,
}))

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
    Math.round(maxHr * (percentage / 100))

  return {
    warmUp: { min: calculateZoneBPM(HR_ZONE_CONFIG.ZONE_2.threshold) },
    fatBurn: { min: calculateZoneBPM(HR_ZONE_CONFIG.ZONE_3.threshold) },
    cardio: { min: calculateZoneBPM(HR_ZONE_CONFIG.ZONE_4.threshold) },
    peak: { min: calculateZoneBPM(HR_ZONE_CONFIG.ZONE_5.threshold) },
    max: { min: calculateZoneBPM(HR_ZONE_CONFIG.ZONE_6.threshold) },
  }
}
