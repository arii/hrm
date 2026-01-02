import { useState, useCallback, useMemo } from 'react'
import { calculateHrZone, HR_ZONE_DEFINITIONS } from '@/lib/hrm/zones'
import { HrZoneName } from '@/lib/shared/hr-zones'
import { getHrZoneColor } from '@/utils/visualization'

interface WorkoutDataPoint {
  time: number
  hr: number
  calories: number
}

interface ZoneDistribution {
  zone: HrZoneName
  duration: number
  percentage: number
  color: string
  bpmRange: string
}

const initializeZoneCounts = (): Record<HrZoneName, number> => {
  const initialCounts = {} as Record<HrZoneName, number>
  HR_ZONE_DEFINITIONS.forEach((zone) => {
    initialCounts[zone.name] = 0
  })
  initialCounts[HrZoneName.NoData] = 0
  return initialCounts
}

const useWorkoutHistory = (maxHr: number) => {
  const [history, setHistory] = useState<WorkoutDataPoint[]>([])
  const [zoneCounts, setZoneCounts] = useState<Record<HrZoneName, number>>(
    initializeZoneCounts
  )

  const addDataPoint = useCallback(
    (hr: number, calories: number) => {
      setHistory((prevHistory) => {
        const newTime = prevHistory.length + 1
        const newDataPoint = { time: newTime, hr, calories }
        return [...prevHistory, newDataPoint]
      })

      const zone = calculateHrZone(hr, maxHr).zoneName
      setZoneCounts((prevCounts) => ({
        ...prevCounts,
        [zone]: (prevCounts[zone] || 0) + 1,
      }))
    },
    [maxHr]
  )

  const zoneDistribution = useMemo(() => {
    const totalDataPoints = history.length
    if (totalDataPoints === 0) {
      return []
    }

    return HR_ZONE_DEFINITIONS.map((zone, index) => {
      const count = zoneCounts[zone.name] || 0
      const percentage = (count / totalDataPoints) * 100
      const nextZone = HR_ZONE_DEFINITIONS[index + 1]
      const upperRange = nextZone ? nextZone.min : 1.0

      return {
        zone: zone.name,
        duration: count,
        percentage,
        color: getHrZoneColor(zone.name),
        bpmRange: `${Math.round(maxHr * zone.min)}-${Math.round(
          maxHr * upperRange
        )}`,
      }
    })
  }, [zoneCounts, history.length, maxHr])

  const resetHistory = useCallback(() => {
    setHistory([])
    setZoneCounts(initializeZoneCounts())
  }, [])

  return { history, zoneDistribution, addDataPoint, resetHistory }
}

export { useWorkoutHistory }
