'use client'
import { useHrZone } from '@/hooks/useHrZone'
import HrTile from '@/components/HrTile'
import { ActiveHrmData } from '@/utils/hrm'
import { memo } from 'react'

export type HrTileWrapperProps = Omit<
  ActiveHrmData,
  'updatedAt' | 'lastUpdated'
>

const HrTileWrapper = ({
  value,
  maxHr,
  name,
  calories,
  isConnected,
  isDataStale,
  isAlerting,
  alertMessage,
}: HrTileWrapperProps) => {
  const hrZoneProps = useHrZone(value, maxHr)

  return (
    <HrTile
      name={name || ''}
      bpm={value}
      percentMax={hrZoneProps.percentage}
      calories={calories}
      isConnected={isConnected}
      isDataStale={isDataStale}
      isAlerting={isAlerting}
      {...(alertMessage && { alertMessage })}
    />
  )
}

export default memo(HrTileWrapper)
