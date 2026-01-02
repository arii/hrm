// File: utils/hr-zones.ts
export interface HrZone {
  zone: number
  name: string
  lower: number // Lower bound percentage of max HR
  upper: number // Upper bound percentage of max HR
  color: string // MUI theme color key
}

export const HR_ZONES: Record<number, HrZone> = {
  1: {
    zone: 1,
    name: 'Very Light',
    lower: 50,
    upper: 60,
    color: 'grey.700',
  },
  2: {
    zone: 2,
    name: 'Light',
    lower: 60,
    upper: 70,
    color: 'info.main',
  },
  3: {
    zone: 3,
    name: 'Moderate',
    lower: 70,
    upper: 80,
    color: 'success.main',
  },
  4: {
    zone: 4,
    name: 'Hard',
    lower: 80,
    upper: 90,
    color: 'warning.main',
  },
  5: {
    zone: 5,
    name: 'Maximum',
    lower: 90,
    upper: 100,
    color: 'error.main',
  },
}

/**
 * Determines the current heart rate zone based on the current and maximum heart rate.
 *
 * @param currentHeartRate - The current heart rate in BPM.
 * @param maxHeartRate - The maximum heart rate in BPM.
 * @returns The zone number (1-5), or 0 if below Zone 1.
 */
export const getHrZone = (
  currentHeartRate: number,
  maxHeartRate: number
): number => {
  if (maxHeartRate <= 0 || currentHeartRate <= 0) return 0
  const percentage = (currentHeartRate / maxHeartRate) * 100
  if (percentage < HR_ZONES[1].lower) return 0
  for (const zoneInfo of Object.values(HR_ZONES)) {
    if (percentage >= zoneInfo.lower && percentage < zoneInfo.upper) {
      return zoneInfo.zone
    }
  }
  // If percentage is 100% or slightly over due to estimation, cap at Zone 5
  if (percentage >= HR_ZONES[5].lower) {
    return HR_ZONES[5].zone
  }
  return 0 // Default case
}
