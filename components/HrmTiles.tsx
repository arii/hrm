// File: app/components/dashboard/HrmTiles.tsx
'use client'
import HrTile from '@/components/HrTile'
import { MAX_HR_DEFAULT } from '@/utils/constants'
import { getHrZoneProps } from '@/utils/visualization'
import Box from '@mui/material/Box'
import Skeleton from '@mui/material/Skeleton'
import { memo } from 'react'

interface HrmTilesProps {
  heartRate: number
  calories: number
  duration: number
}

const HrmTiles = ({ heartRate, calories }: HrmTilesProps) => {
  const hrZoneProps = getHrZoneProps(heartRate, MAX_HR_DEFAULT)

  if (heartRate === 0) {
    return (
      <Box sx={{ display: 'flex', gap: 2 }}>
        <Skeleton
          variant="rectangular"
          height={220}
          sx={{ borderRadius: 3, flex: 1 }}
        />
        <Skeleton
          variant="rectangular"
          height={220}
          sx={{ borderRadius: 3, flex: 1 }}
        />
      </Box>
    )
  }

  return (
    <Box sx={{ display: 'flex', gap: 2 }}>
      <HrTile
        name="Live Heart Rate"
        bpm={heartRate}
        percentMax={hrZoneProps.percentage}
        calories={calories}
      />
    </Box>
  )
}

export default memo(HrmTiles)
