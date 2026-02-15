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
 * Thresholds are stored as decimals (0-1) representing percentage of Max HR.
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
    threshold: 0.95,
    color: HR_COLORS.ZONE_6_MAX,
    textColor: HR_COLORS.TEXT_LIGHT,
    zoneNumber: 6,
  },
  ZONE_5: {
    label: 'Peak',
    threshold: 0.9,
    color: HR_COLORS.ZONE_5_PEAK,
    textColor: HR_COLORS.TEXT_LIGHT,
    zoneNumber: 5,
  },
  ZONE_4: {
    label: 'Cardio',
    threshold: 0.8,
    color: HR_COLORS.ZONE_4_CARDIO,
    textColor: HR_COLORS.TEXT_LIGHT,
    zoneNumber: 4,
  },
  ZONE_3: {
    label: 'Fat Burn',
    threshold: 0.7,
    color: HR_COLORS.ZONE_3_FATBURN,
    textColor: HR_COLORS.TEXT_LIGHT,
    zoneNumber: 3,
  },
  ZONE_2: {
    label: 'Warm Up',
    threshold: 0.6,
    color: HR_COLORS.ZONE_2_WARMUP,
    textColor: HR_COLORS.TEXT_LIGHT,
    zoneNumber: 2,
  },
  ZONE_1: {
    label: 'Recovery',
    threshold: 0.5,
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
 * Calculates the percentage of max HR and the corresponding zone (0-6) based on Max HR.
 * @param currentHr - Current heart rate in BPM.
 * @param maxHr - Max Heart Rate.
 * @returns An object containing the calculated percentage and zone number.
 */
export const calculateZoneFromMaxHr = (
  currentHr: number,
  maxHr: number
): { percentage: number; zone: number } => {
  const percentageDecimal = maxHr > 0 && currentHr > 0 ? currentHr / maxHr : 0
  const percentage = Math.min(100, Math.round(percentageDecimal * 100))

  let zone = 0
  if (percentageDecimal >= HR_ZONE_CONFIG.ZONE_6.threshold) zone = 6
  else if (percentageDecimal >= HR_ZONE_CONFIG.ZONE_5.threshold) zone = 5
  else if (percentageDecimal >= HR_ZONE_CONFIG.ZONE_4.threshold) zone = 4
  else if (percentageDecimal >= HR_ZONE_CONFIG.ZONE_3.threshold) zone = 3
  else if (percentageDecimal >= HR_ZONE_CONFIG.ZONE_2.threshold) zone = 2
  else if (percentageDecimal >= HR_ZONE_CONFIG.ZONE_1.threshold) zone = 1

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
  minPercent: Math.round(HR_ZONE_CONFIG[z].threshold * 100),
  maxPercent:
    z === 'ZONE_6'
      ? 100
      : Math.round(
          HR_ZONE_CONFIG[
            `ZONE_${HR_ZONE_CONFIG[z].zoneNumber + 1}` as HeartRateZone
          ].threshold * 100
        ),
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

  return {
    warmUp: { min: Math.round(maxHr * HR_ZONE_CONFIG.ZONE_2.threshold) },
    fatBurn: { min: Math.round(maxHr * HR_ZONE_CONFIG.ZONE_3.threshold) },
    cardio: { min: Math.round(maxHr * HR_ZONE_CONFIG.ZONE_4.threshold) },
    peak: { min: Math.round(maxHr * HR_ZONE_CONFIG.ZONE_5.threshold) },
    max: { min: Math.round(maxHr * HR_ZONE_CONFIG.ZONE_6.threshold) },
  }
}
