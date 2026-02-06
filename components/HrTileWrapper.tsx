// File: components/HrTileWrapper.tsx
'use client'
import HrTile from '@/components/HrTile'
import { HrmData } from '@/types/websocket'
import { calculateZoneFromMaxHr } from '@/lib/shared/hr-zones'

interface HrTileWrapperProps {
  user: HrmData & { isAlerting: boolean; alertMessage?: string }
}

const HrTileWrapper = ({ user }: HrTileWrapperProps) => {
  const { percentage } = calculateZoneFromMaxHr(user.value, user.maxHr)
  return (
    <HrTile
      name={user.name || ''}
      bpm={user.value}
      percentMax={percentage}
      calories={user.calories}
      isConnected={user.value !== null}
      isAlerting={user.isAlerting}
      {...(user.alertMessage && { alertMessage: user.alertMessage })}
    />
  )
}

export default HrTileWrapper
