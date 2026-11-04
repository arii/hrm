import { useEffect, useRef } from 'react'
import type { HrmData } from '@/types/websocket'
import type { WorkoutStatus } from '@/types/workout'

/**
 * Records one HR sample per second while the workout runs. The latest
 * reading is mirrored into a ref so the interval never resets on HR
 * updates (addresses audit issue #1). Extracted verbatim from
 * ExperimentalAnalyticsPage.
 */
export const useHrRecording = (
  status: WorkoutStatus,
  hrmData: HrmData[],
  addHrData: (hr: number) => void
): void => {
  const latestHrRef = useRef(0)

  useEffect(() => {
    latestHrRef.current = hrmData[0]?.value ?? 0
  }, [hrmData])

  // Recording interval - only depends on status, not hrmData
  useEffect(() => {
    if (status !== 'running') return

    const intervalId = setInterval(() => {
      const currentHr = latestHrRef.current
      // Add HR data point (handles calorie calc internally)
      addHrData(currentHr)
    }, 1000)

    return () => clearInterval(intervalId)
  }, [status, addHrData])
}
