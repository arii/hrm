'use client'
import HrTile from '@/components/HrTile'
import { ClientHrmData } from '@/types/websocket'
import { memo } from 'react'
import { calculateHrZoneInfo } from '@/lib/shared/hr-zones'

// Omit volatile timestamps to allow React.memo to work effectively with shallow comparison
type HrTileWrapperProps = Omit<ClientHrmData, 'updatedAt' | 'lastUpdated'>

const HrTileWrapper = (props: HrTileWrapperProps) => {
  // Use the percentage and zone from the props if available,
  // falling back to local calculation if not (ensures consistent logic).
  const { percentage: fallbackPercentage, zone: fallbackZone } =
    calculateHrZoneInfo(props.value || 0, props.age)

  const percentMax = props.percentage ?? fallbackPercentage
  const zone = props.zone ?? fallbackZone

  return (
    <HrTile
      name={props.name || ''}
      bpm={props.value}
      percentMax={percentMax}
      zone={zone}
      calories={props.calories}
      isConnected={props.isConnected}
      isDataStale={props.isDataStale}
      isAlerting={props.isAlerting}
      {...(props.alertMessage && { alertMessage: props.alertMessage })}
    />
  )
}

export default memo(HrTileWrapper)
