// File: hooks/useHrZoneTracker.ts
import { useState, useEffect, useRef } from 'react'
import { getHrZone, HR_ZONES } from '../utils/hr-zones'

export interface HrZoneDuration {
  zone: number
  name: string
  duration: number // in seconds
  percentage: number
  color: string
}

const INITIAL_ZONES: HrZoneDuration[] = Object.values(HR_ZONES).map(
  (zoneInfo) => ({
    zone: zoneInfo.zone,
    name: zoneInfo.name,
    duration: 0,
    percentage: 0,
    color: zoneInfo.color,
  })
)

/**
 * Custom hook to track the time spent in each heart rate zone during a workout.
 *
 * @param currentHeartRate - The user's current heart rate.
 * @param maxHeartRate - The user's maximum heart rate.
 * @param isActive - Boolean indicating if the workout is currently active.
 * @returns An array of objects, each representing a heart rate zone and the time spent in it.
 */
export const useHrZoneTracker = (
  currentHeartRate: number,
  maxHeartRate: number,
  isActive: boolean
): HrZoneDuration[] => {
  const [zoneDurations, setZoneDurations] =
    useState<HrZoneDuration[]>(INITIAL_ZONES)
  const lastTickRef = useRef<number | null>(null)
  const activeZoneRef = useRef<number | null>(null)

  useEffect(() => {
    if (!isActive) {
      lastTickRef.current = null
      activeZoneRef.current = null
      setZoneDurations(INITIAL_ZONES)
    }
  }, [isActive])

  useEffect(() => {
    // Do not track time if the workout is inactive or if max HR is not set.
    if (!isActive || maxHeartRate <= 0) {
      return
    }

    lastTickRef.current = Date.now() // Initialize on activation

    const tick = () => {
      const now = Date.now()
      const lastTick = lastTickRef.current

      // We need a lastTick to calculate delta, and an active zone to accumulate into.
      if (lastTick && activeZoneRef.current !== null) {
        const deltaSeconds = (now - lastTick) / 1000
        setZoneDurations((prevDurations) => {
          const newDurations = [...prevDurations]
          const zoneIndex = newDurations.findIndex(
            (z) => z.zone === activeZoneRef.current
          )

          if (zoneIndex !== -1) {
            newDurations[zoneIndex].duration += deltaSeconds
          }

          const totalDuration = newDurations.reduce(
            (sum, z) => sum + z.duration,
            0
          )
          // Avoid division by zero and unnecessary re-renders.
          if (totalDuration > 0) {
            return newDurations.map((zone) => ({
              ...zone,
              percentage: (zone.duration / totalDuration) * 100,
            }))
          }
          return newDurations
        })
      }
      // Always update the ref for the next tick's calculation.
      lastTickRef.current = now
    }

    // When this effect runs, it means we should start tracking.
    // We call tick() once immediately to set the initial `lastTickRef.current`.
    // This ensures that the very first interval calculates a delta and accumulates duration.
    tick()
    const intervalId = setInterval(tick, 1000)

    return () => clearInterval(intervalId)
  }, [isActive, maxHeartRate])

  useEffect(() => {
    if (isActive && currentHeartRate > 0 && maxHeartRate > 0) {
      const currentZone = getHrZone(currentHeartRate, maxHeartRate)
      activeZoneRef.current = currentZone
    } else {
      activeZoneRef.current = null
    }
  }, [currentHeartRate, maxHeartRate, isActive])

  return zoneDurations
}
