// File: components/HrTileWrapper.tsx
'use client'
import HrTile from '@/components/HrTile'
import { HrmData } from '@/types/websocket'
import { calculateHrZoneInfo } from '@/lib/shared/hr-zones'

interface HrTileWrapperProps {
  user: HrmData & { isAlerting: boolean; alertMessage?: string }
}

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
      isConnected={user.value !== null}
      isAlerting={user.isAlerting}
      {...(user.alertMessage && { alertMessage: user.alertMessage })}
    />
  )
}

export default HrTileWrapper
