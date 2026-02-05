// File: components/HrTileWrapper.tsx
'use client'
import { useHrZone } from '@/hooks/useHrZone'
import HrTile from '@/components/HrTile'
import { HrmData } from '@/context/webSocketReducer'
import { HRM_WARNING_THRESHOLD_MS } from '@/utils/constants'

interface HrTileWrapperProps {
  user: HrmData & { isAlerting: boolean; alertMessage?: string }
}

const HrTileWrapper = ({ user }: HrTileWrapperProps) => {
  const hrZoneProps = useHrZone(user.value, user.maxHr)

  // Use the lastUpdated timestamp from the reducer to determine staleness.
  // We use Date.now() here because the parent component (HrmConnectionPanel)
  // already uses the useNow hook, which triggers a re-render of this component
  // every second, ensuring the stale state is kept up-to-date.
  const isDataStale =
    user.lastUpdated && Date.now() - user.lastUpdated > HRM_WARNING_THRESHOLD_MS

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
