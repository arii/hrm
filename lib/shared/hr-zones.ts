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
 */
export const HR_ZONE_VISUAL_CONFIG = {
  5: { color: '#ff0000', label: HrZoneName.Peak },
  4: { color: '#ff8000', label: HrZoneName.Cardio },
  3: { color: '#ffff00', label: HrZoneName.Aerobic },
  2: { color: '#00ff00', label: HrZoneName.WarmUp },
  1: { color: '#00ffff', label: HrZoneName.Recovery },
  0: { color: '#cccccc', label: HrZoneName.Idle },
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
