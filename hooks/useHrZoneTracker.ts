// File: hooks/useHrZoneTracker.ts
import { useState, useEffect, useRef, useCallback } from 'react'
import { getHrZone, HR_ZONES } from '../lib/hrm/zones'

export interface HrZoneDuration {
  zone: number
  name: string
  duration: number // in seconds
  percentage: number
  color: string
}

const INITIAL_ZONES: HrZoneDuration[] = Object.values(HR_ZONES).map(
  (zoneInfo) => ({
    ...zoneInfo,
    duration: 0,
    percentage: 0,
  })
)

/**
 * Custom hook to track the time spent in each heart rate zone during a workout.
 *
 * @param currentHeartRate - The user's current heart rate.
 * @param maxHeartRate - The user's maximum heart rate.
 * @param isActive - Boolean indicating if the workout is currently active.
 * @returns An object containing `zoneDurations` and a `reset` function.
 */
export const useHrZoneTracker = (
  currentHeartRate: number,
  maxHeartRate: number,
  isActive: boolean
): {
  zoneDurations: HrZoneDuration[]
  reset: () => void
} => {
  const [zoneDurations, setZoneDurations] =
    useState<HrZoneDuration[]>(INITIAL_ZONES)
  const lastTickRef = useRef<number | null>(null)
  const activeZoneRef = useRef<number | null>(null)

  const reset = useCallback(() => {
    setZoneDurations(INITIAL_ZONES)
    lastTickRef.current = null
    activeZoneRef.current = null
  }, [])

  useEffect(() => {
    if (!isActive) {
      lastTickRef.current = null
      activeZoneRef.current = null
    } else {
      lastTickRef.current = Date.now()
    }
  }, [isActive])

  useEffect(() => {
    if (!isActive || maxHeartRate <= 0) {
      return
    }

    const tick = () => {
      const now = Date.now()
      const lastTick = lastTickRef.current
      const currentZone = activeZoneRef.current

      if (lastTick && currentZone !== null) {
        const deltaSeconds = (now - lastTick) / 1000
        if (deltaSeconds > 0) {
          setZoneDurations((prevDurations) => {
            const newDurations = prevDurations.map((zone) =>
              zone.zone === currentZone
                ? { ...zone, duration: zone.duration + deltaSeconds }
                : zone
            )
            const totalDuration = newDurations.reduce(
              (sum, z) => sum + z.duration,
              0
            )
            return totalDuration > 0
              ? newDurations.map((zone) => ({
                  ...zone,
                  percentage: (zone.duration / totalDuration) * 100,
                }))
              : newDurations
          })
        }
      }
      lastTickRef.current = now
    }

    const intervalId = setInterval(tick, 1000)
    return () => clearInterval(intervalId)
  }, [isActive, maxHeartRate])

  useEffect(() => {
    if (isActive && currentHeartRate > 0 && maxHeartRate > 0) {
      const currentZone = getHrZone(currentHeartRate, maxHeartRate)
      if (currentZone !== activeZoneRef.current) {
        lastTickRef.current = Date.now() // Reset tick time on zone change
        activeZoneRef.current = currentZone
      }
    } else {
      activeZoneRef.current = null
    }
  }, [currentHeartRate, maxHeartRate, isActive])

  return { zoneDurations, reset }
}
