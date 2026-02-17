'use client'
import HrTile from '@/components/HrTile'
import { ClientHrmData } from '@/types/websocket'
import { memo } from 'react'

// Omit volatile timestamps to allow React.memo to work effectively with shallow comparison
type HrTileWrapperProps = Omit<ClientHrmData, 'updatedAt' | 'lastUpdated'>

const HrTileWrapper = (props: HrTileWrapperProps) => {
  return (
    <HrTile
      {...props}
      name={props.name || ''}
      percentage={props.percentage ?? 0}
      zone={props.zone ?? 0}
    />
  )
}

export default memo(HrTileWrapper)
