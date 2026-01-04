// hooks/useHeartRateHistory.ts
import { useState, useCallback, useRef } from 'react'
import { getHrZoneProps, ZONE_COLORS } from '@/utils/visualization'

export interface HeartRateSample {
  timestamp: number
  hr: number
}

export interface ZoneData {
  [zone: string]: number // Store seconds in each zone
}

const ZONE_NAMES = Object.keys(ZONE_COLORS)

/**
 * @hook useHeartRateHistory
 * @description A hook to manage and store a time-series history of heart rate data
 * and the distribution of time spent in each heart rate zone.
 *
 * @param {number} maxHr - The user's maximum heart rate, used for zone calculation.
 * @returns {{
 *   history: HeartRateSample[],
 *   zoneDistribution: ZoneData,
 *   addHeartRateSample: (hr: number) => void,
 *   resetHistory: () => void
 * }} An object containing the heart rate history, zone distribution, and functions to manage them.
 */
export const useHeartRateHistory = (maxHr: number) => {
  const [history, setHistory] = useState<HeartRateSample[]>([])
  const [zoneDistribution, setZoneDistribution] = useState<ZoneData>(() =>
    ZONE_NAMES.reduce((acc, zone) => ({ ...acc, [zone]: 0 }), {})
  )

  const lastTimestampRef = useRef<number | null>(null)

  /**
   * Adds a new heart rate measurement to the history and updates
   * the time spent in the corresponding heart rate zone.
   *
   * @param hr The current heart rate in BPM.
   */
  const addHeartRateSample = useCallback(
    (hr: number) => {
      const now = Date.now()
      const newSample = { timestamp: now, hr }

      setHistory((prevHistory) => [...prevHistory, newSample])

      if (lastTimestampRef.current) {
        const dtSeconds = (now - lastTimestampRef.current) / 1000
        if (dtSeconds > 0 && dtSeconds < 10) {
          // Check for reasonable delta
          const { zone } = getHrZoneProps(hr, maxHr)
          if (zone) {
            setZoneDistribution((prevZones) => ({
              ...prevZones,
              [zone]: (prevZones[zone] || 0) + dtSeconds,
            }))
          }
        }
      }
      lastTimestampRef.current = now
    },
    [maxHr]
  )

  /**
   * Resets the heart rate history and zone distribution data.
   */
  const resetHistory = useCallback(() => {
    setHistory([])
    setZoneDistribution(
      ZONE_NAMES.reduce((acc, zone) => ({ ...acc, [zone]: 0 }), {})
    )
    lastTimestampRef.current = null
  }, [])

  return { history, zoneDistribution, addHeartRateSample, resetHistory }
}
