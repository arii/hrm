'use client'
import { memo } from 'react'
import { HrTileProps } from '@/types'

const HrTile = ({
  name,
  bpm,
  percentMax,
  calories = 0, // Default to 0 to prevent NaN
  isConnected = true, // Default to connected
  isAlerting = false,
  alertMessage = 'Checking signal...',
}: HrTileProps) => {
  return (
    <div>
      <h2>HR Tile</h2>
      <p>This component has been temporarily simplified to remove dead code.</p>
    </div>
  )
}

// Custom comparison function for React.memo
const arePropsEqual = (prevProps: HrTileProps, nextProps: HrTileProps) => {
  return (
    prevProps.name === nextProps.name &&
    prevProps.bpm === nextProps.bpm &&
    prevProps.percentMax === nextProps.percentMax &&
    prevProps.calories === nextProps.calories &&
    prevProps.isConnected === nextProps.isConnected &&
    prevProps.isAlerting === nextProps.isAlerting &&
    prevProps.alertMessage === nextProps.alertMessage
  )
}

export default memo(HrTile, arePropsEqual)
