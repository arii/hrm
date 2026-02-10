'use client'
import HrTile from '@/components/HrTile'
import { ClientHrmData } from '@/context/webSocketReducer'
import { memo } from 'react'
import { HrmData } from '@/types/websocket'
import { calculateHrZoneInfo } from '@/lib/shared/hr-zones'

interface HrTileWrapperProps {
  user: ClientHrmData
  isDataStale: boolean
}

const HrTileWrapper = ({ user, isDataStale }: HrTileWrapperProps) => {
  const hrZoneProps = useHrZone(user.value, user.maxHr)
const HrTileWrapper = ({ user }: HrTileWrapperProps) => {
  // Use the percentage and zone from the user object if available,
  // falling back to local calculation if not (ensures consistent logic).
  const { percentage: fallbackPercentage, zone: fallbackZone } =
    calculateHrZoneInfo(user.value || 0, user.age)

  const percentMax = user.percentage ?? fallbackPercentage
  const zone = user.zone ?? fallbackZone

  return (
    <HrTile
      name={user.name || ''}
      bpm={user.value}
      percentMax={percentMax}
      zone={zone}
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
