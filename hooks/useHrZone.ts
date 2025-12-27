// hooks/useHrZone.ts
import { useMemo } from 'react'
import { getHrZoneProps } from '../utils/visualization'

export const useHrZone = (heartRate: number, maxHr: number) => {
  const hrZoneProps = useMemo(() => {
    return getHrZoneProps(heartRate, maxHr)
  }, [heartRate, maxHr])

  return hrZoneProps
}
