// File: components/HrTileWrapper.tsx
'use client'
import { useHrZone } from '@/hooks/useHrZone'
import HrTile from '@/components/HrTile'
import { HrmData } from '@/context/webSocketReducer'
import { useNow } from '@/hooks/useNow'
import { HRM_WARNING_THRESHOLD_MS } from '@/utils/constants'

interface HrTileWrapperProps {
  user: HrmData & { isAlerting: boolean; alertMessage?: string }
}

const HrTileWrapper = ({ user }: HrTileWrapperProps) => {
  const hrZoneProps = useHrZone(user.value, user.maxHr)
  const now = useNow()

  // Use the lastUpdated timestamp from the reducer to determine staleness.
  const isDataStale =
    user.lastUpdated && now - user.lastUpdated > HRM_WARNING_THRESHOLD_MS

  return (
    <HrTile
      name={user.name || ''}
      bpm={user.value}
      percentMax={hrZoneProps.percentage}
      calories={user.calories}
      isConnected={user.isConnected}
      isDataStale={!!isDataStale}
      isAlerting={user.isAlerting}
      {...(user.alertMessage && { alertMessage: user.alertMessage })}
    />
  )
}

export default HrTileWrapper
