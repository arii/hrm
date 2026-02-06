// File: components/HrTileWrapper.tsx
'use client'
import { useHrZone } from '@/hooks/useHrZone'
import HrTile from '@/components/HrTile'
import { HrmData } from '@/types/websocket'
import { HrZoneName } from '@/lib/shared/hr-zones'

interface HrTileWrapperProps {
  user: HrmData & { isAlerting: boolean; alertMessage?: string }
}

const HrTileWrapper = ({ user }: HrTileWrapperProps) => {
  const hookData = useHrZone(user.value, user.maxHr)

  const percentMax = user.percentage ?? hookData.percentage
  // user.zone is likely string from server, hookData.zone is string from getHrZoneProps
  const zone = (user.zone as HrZoneName) ?? (hookData.zone as HrZoneName)

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
