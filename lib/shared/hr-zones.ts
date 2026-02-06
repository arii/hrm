import type { HrZone } from '../../types/heart-rate'

export const MAX_HR_DEFAULT = 185

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
  { name: HrZoneName.WarmUp, min: 0.5 },
  { name: HrZoneName.FatBurn, min: 0.6 },
  { name: HrZoneName.Cardio, min: 0.7 },
  { name: HrZoneName.Peak, min: 0.85 },
  { name: HrZoneName.Max, min: 0.95 },
]

export const calculateMaxHr = (age?: number | string | null): number => {
  if (!age) return MAX_HR_DEFAULT
  const ageNum = typeof age === 'string' ? parseInt(age, 10) : age
  if (isNaN(ageNum) || ageNum <= 0) return MAX_HR_DEFAULT
  return 208 - 0.7 * ageNum
}

export const calculateHrZone = (currentHr: number, maxHr: number): HrZone => {
  if (!maxHr || !currentHr || currentHr <= 0) {
    return {
      zoneName: HrZoneName.NoData,
      percentage: 0,
      bpm: 0,
    }
  }

  const percentageOfMax = Math.min(100, Math.round((currentHr / maxHr) * 100))
  let calculatedZone = HR_ZONE_DEFINITIONS[0] || {
    name: HrZoneName.Unknown,
    min: 0,
  }

  for (let i = HR_ZONE_DEFINITIONS.length - 1; i >= 0; i--) {
    const hrZone = HR_ZONE_DEFINITIONS[i]
    if (hrZone && percentageOfMax / 100 >= hrZone.min) {
      calculatedZone = hrZone
      break
    }
  }

  return {
    zoneName: calculatedZone.name,
    percentage: percentageOfMax,
    bpm: currentHr,
  }
}

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
