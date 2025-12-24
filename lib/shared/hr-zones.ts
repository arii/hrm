// File: lib/shared/hr-zones.ts
/**
 * Shared constants and types for Heart Rate (HR) zones to ensure consistency
 * across different modules (domain logic, UI, etc.).
 */

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

export const HR_ZONE_DEFINITIONS = [
  { name: HrZoneName.WarmUp, range: [0.5, 0.6] },
  { name: HrZoneName.FatBurn, range: [0.6, 0.7] },
  { name: HrZoneName.Cardio, range: [0.7, 0.8] },
  { name: HrZoneName.Peak, range: [0.8, 0.9] },
  { name: HrZoneName.Max, range: [0.9, 1.0] },
]
