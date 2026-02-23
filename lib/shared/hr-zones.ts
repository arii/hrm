/**
 * Shared constants and types for Heart Rate (HR) zones to ensure consistency
 * across different modules (domain logic, UI, etc.).
 */
import { HR_COLORS } from '@/lib/shared/colors'
import { calculateMaxHr } from '@/utils/hrCalculations'

export { calculateMaxHr }

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
 * Pre-calculated order of zone labels for sorting purposes (highest intensity first).
 */
export const HR_ZONE_ORDER: HeartRateZone[] = [
  'ZONE_6',
  'ZONE_5',
  'ZONE_4',
  'ZONE_3',
  'ZONE_2',
  'ZONE_1',
  'ZONE_0',
]

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

  // Use the rounded percentage for threshold comparison to match UI display
  const percentageDecimal = percentage / 100

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
 * Helper to safely cast a numeric zone to a HeartRateZone key.
 */
export const toHeartRateZone = (zoneNum: number): HeartRateZone => {
  const key = `ZONE_${zoneNum}` as HeartRateZone
  return key in HR_ZONE_CONFIG ? key : 'ZONE_0'
}

type UserHrZones = {
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
