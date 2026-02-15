'use client'
import HrTile from '@/components/HrTile'
import { ClientHrmData } from '@/types/websocket'
import { memo } from 'react'

// Omit volatile timestamps to allow React.memo to work effectively with shallow comparison
type HrTileWrapperProps = Omit<ClientHrmData, 'updatedAt' | 'lastUpdated'>

const HrTileWrapper = (props: HrTileWrapperProps) => {
  return (
    <HrTile
      name={props.name || ''}
      bpm={props.value}
      percentMax={props.percentage ?? 0}
      zone={props.zone ?? 'ZONE_0'}
      calories={props.calories}
      isConnected={props.isConnected}
      isDataStale={props.isDataStale}
      isAlerting={props.isAlerting}
      {...(props.alertMessage && { alertMessage: props.alertMessage })}
    />
  )
}

export default memo(HrTileWrapper)
