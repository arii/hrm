// File: utils/hr.ts
import { HR_ZONE_SETTINGS } from '@/constants/hr'

export const getHrZone = (hr: number, maxHr: number) => {
  const percentage = (hr / maxHr) * 100
  if (percentage < HR_ZONE_SETTINGS.Z1.threshold) return 'Z1'
  if (percentage < HR_ZONE_SETTINGS.Z2.threshold) return 'Z2'
  if (percentage < HR_ZONE_SETTINGS.Z3.threshold) return 'Z3'
  if (percentage < HR_ZONE_SETTINGS.Z4.threshold) return 'Z4'
  return 'Z5'
}

export const calculateTimeInZone = (
  timeInZone: Record<string, number>,
  hr: number,
  maxHr: number,
  elapsedTime: number
) => {
  const zone = getHrZone(hr, maxHr)
  const newTimeInZone = { ...timeInZone }
  newTimeInZone[zone] = (newTimeInZone[zone] || 0) + elapsedTime
  return newTimeInZone
}
