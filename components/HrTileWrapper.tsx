// File: components/HrTileWrapper.tsx
'use client'
import { useHrZone } from '@/hooks/useHrZone'
import HrTile from '@/components/HrTile'
import { EnhancedHrmDataForTile } from '@/types'

interface HrTileWrapperProps {
  user: EnhancedHrmDataForTile
}

const HrTileWrapper = ({ user }: HrTileWrapperProps) => {
  const hrZoneProps = useHrZone(user.value, user.maxHr)
  return (
    <HrTile
      name={user.name || ''}
      bpm={user.value}
      percentMax={hrZoneProps.percentage}
      calories={user.calories ?? 0}
      isConnected={user.value !== null}
      isAlerting={user.isAlerting}
      {...(user.alertMessage && { alertMessage: user.alertMessage })}
    />
  )
}

export default HrTileWrapper
