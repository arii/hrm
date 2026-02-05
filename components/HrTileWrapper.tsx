// File: components/HrTileWrapper.tsx
'use client'
import { useHrZone } from '@/hooks/useHrZone'
import HrTile from '@/components/HrTile'
import { HrmData } from '@/types/websocket'

interface HrTileWrapperProps {
  user: HrmData & {
    isAlerting: boolean
    alertMessage?: string
    isDataStale?: boolean
  }
}

const HrTileWrapper = ({ user }: HrTileWrapperProps) => {
  const hrZoneProps = useHrZone(user.value, user.maxHr)
  return (
    <HrTile
      name={user.name || ''}
      bpm={user.value}
      percentMax={hrZoneProps.percentage}
      calories={user.calories}
      isConnected={user.value !== null}
      isDataStale={user.isDataStale}
      isAlerting={user.isAlerting}
      {...(user.alertMessage && { alertMessage: user.alertMessage })}
    />
  )
}

export default HrTileWrapper
