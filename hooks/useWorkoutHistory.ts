'use client'

import { useState, useCallback, useMemo } from 'react'
import { getHrZoneProps } from '@/utils/visualization'
import { HR_ZONE_RANGES } from '@/lib/hrm/zones'

interface WorkoutDataPoint {
  time: number
  hr: number
  calories: number
}

interface ZoneData {
  duration: number
}

interface ZoneDistribution {
  [key: string]: ZoneData
}

export const useWorkoutHistory = (maxHr: number) => {
  const [history, setHistory] = useState<WorkoutDataPoint[]>([])
  const [zoneDistribution, setZoneDistribution] = useState<ZoneDistribution>({})
  const [totalDuration, setTotalDuration] = useState(0)

  const addDataPoint = useCallback(
    (hr: number, calories: number) => {
      setTotalDuration((prevDuration) => {
        const newDuration = prevDuration + 1
        setHistory((prevHistory) => [
          ...prevHistory,
          { time: newDuration, hr, calories },
        ])
        return newDuration
      })

      const currentZone = getHrZoneProps(hr, maxHr).zone
      setZoneDistribution((prevDistribution) => {
        const newDistribution = { ...prevDistribution }
        if (!newDistribution[currentZone]) {
          newDistribution[currentZone] = { duration: 0 }
        }
        newDistribution[currentZone].duration += 1 // Assuming 1-second intervals
        return newDistribution
      })
    },
    [maxHr]
  )

  const resetHistory = useCallback(() => {
    setHistory([])
    setZoneDistribution({})
    setTotalDuration(0)
  }, [])

  const formattedZoneDistribution = useMemo(() => {
    return Object.entries(zoneDistribution)
      .map(([zone, data]) => {
        const range = HR_ZONE_RANGES[zone]
        const minBpm = Math.round(range.min * maxHr)
        const maxBpm = Math.round(range.max * maxHr)

        return {
          zone,
          range: `${minBpm} - ${maxBpm}`,
          duration: data.duration,
          percentage:
            totalDuration > 0 ? (data.duration / totalDuration) * 100 : 0,
        }
      })
      .sort((a, b) => {
        const zoneA = HR_ZONE_RANGES[a.zone].min
        const zoneB = HR_ZONE_RANGES[b.zone].min
        return zoneA - zoneB
      })
  }, [zoneDistribution, totalDuration, maxHr])

  return {
    history,
    zoneDistribution: formattedZoneDistribution,
    addDataPoint,
    resetHistory,
  }
}
