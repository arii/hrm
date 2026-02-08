'use client'
import { useHrZone } from '@/hooks/useHrZone'
import HrTile from '@/components/HrTile'
import { ClientHrmData } from '@/context/webSocketReducer'
import { memo } from 'react'

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

const arePropsEqual = (
  prevProps: HrTileWrapperProps,
  nextProps: HrTileWrapperProps
) => {
  return (
    prevProps.isDataStale === nextProps.isDataStale &&
    prevProps.user.value === nextProps.user.value &&
    prevProps.user.maxHr === nextProps.user.maxHr &&
    prevProps.user.name === nextProps.user.name &&
    prevProps.user.calories === nextProps.user.calories &&
    prevProps.user.isConnected === nextProps.user.isConnected &&
    prevProps.user.isAlerting === nextProps.user.isAlerting &&
    prevProps.user.alertMessage === nextProps.user.alertMessage
  )
}

export default memo(HrTileWrapper, arePropsEqual)
