'use client'
import HrTile from '@/components/HrTile'
import { ClientHrmData } from '@/types/websocket'
import Box from '@mui/material/Box'
import { memo } from 'react'

// Omit volatile timestamps to allow React.memo to work effectively with shallow comparison
type HrTileWrapperProps = Omit<ClientHrmData, 'updatedAt' | 'lastUpdated'>

const HrTileWrapper = (props: HrTileWrapperProps) => {
  return (
    <Box sx={{ height: '100%', minHeight: 180 }}>
      <HrTile
        {...props}
        name={props.name || ''}
        value={props.value}
        percentage={props.percentage ?? 0}
        zone={props.zone ?? 'ZONE_0'}
        calories={props.calories}
        isConnected={props.isConnected}
        isDataStale={props.isDataStale}
        isAlerting={props.isAlerting}
        {...(props.alertMessage && { alertMessage: props.alertMessage })}
      />
    </Box>
  )
}

export default memo(HrTileWrapper)
