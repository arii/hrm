import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { estimateCaloriesBurned } from '@/lib/calorie-estimation'
import { useUserPhysicalProfile } from '@/context/UserPhysicalProfileContext'

/**
 * Automatically tracks calorie burn based on the current user's global physical profile.
 */
export const useCalorieCounter = (
  heartRate: number,
  isActive: boolean
): { calories: number; resetCalories: () => void } => {
  const { profile } = useUserPhysicalProfile()
  const [calories, setCalories] = useState(0)

  // Refs for calculation loop to avoid re-binding the interval
  const lastTickRef = useRef<number | null>(null)
  const heartRateRef = useRef(heartRate)
  const profileRef = useRef(profile)

  // Sync Refs
  useEffect(() => {
    heartRateRef.current = heartRate
    profileRef.current = profile
  }, [heartRate, profile])

  useEffect(() => {
    if (!isActive) {
      lastTickRef.current = null
      return
    }

    lastTickRef.current = Date.now()

    const tick = () => {
      const now = Date.now()
      if (lastTickRef.current) {
        const deltaSeconds = (now - lastTickRef.current) / 1000

        // Only calculate if we have valid biometric data
        if (heartRateRef.current > 0) {
          const inc = estimateCaloriesBurned({
            heartRate: heartRateRef.current,
            durationMinutes: deltaSeconds / 60,
            // Inject latest profile data directly from ref
            age: profileRef.current.age,
            weightKg: profileRef.current.weight,
            gender: profileRef.current.gender
          })
          setCalories((prev) => prev + inc)
        }
      }
      lastTickRef.current = now
    }

    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [isActive])

  const resetCalories = useCallback(() => {
    setCalories(0)
    lastTickRef.current = null
  }, [])

  return useMemo(() => ({ calories, resetCalories }), [calories, resetCalories])
}
