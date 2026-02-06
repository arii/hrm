'use client'
import { useHrZone } from '@/hooks/useHrZone'
import HrTile from '@/components/HrTile'
import { ClientHrmData } from '@/context/webSocketReducer'

interface HrTileWrapperProps {
  user: ClientHrmData
  isDataStale: boolean
}

const HrTileWrapper = ({ user, isDataStale }: HrTileWrapperProps) => {
  const hrZoneProps = useHrZone(user.value, user.maxHr)

  return (
    <HrTile
      name={user.name || ''}
      bpm={user.value}
      percentMax={hrZoneProps.percentage}
      calories={user.calories}
      isConnected={user.isConnected}
      isDataStale={isDataStale}
      isAlerting={user.isAlerting}
      {...(user.alertMessage && { alertMessage: user.alertMessage })}
    />
  )
}

export default HrTileWrapper
