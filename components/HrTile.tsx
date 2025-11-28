// File: components/HrTile.tsx
'use client'
import CardContent from '@mui/material/CardContent'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { memo } from 'react'
import StyledCard from './shared/StyledCard'

export interface HrTileProps {
  name: string
  bpm: number
  percentMax: number // 0-100
  background: string // hex color
}

const HrTile = ({ name, bpm, percentMax, background }: HrTileProps) => {
  return (
    <Tooltip
      title={`Name: ${name}, BPM: ${bpm}, % Max HR: ${percentMax}%`}
      arrow
    >
      <StyledCard
        data-testid="hr-tile-card"
        role="region"
        aria-label={`Heart rate monitor for ${name}: ${bpm} beats per minute, ${percentMax}% of maximum`}
        sx={{
          backgroundColor: background,
          color: '#fff',
          textAlign: 'center',
          minHeight: 180,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}
      >
        <CardContent sx={{ p: 0 }}>
          {/* Giant Percentage - should dominate the tile */}
          <Typography variant="hrPercentage">
            {percentMax}%
          </Typography>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 600,
              fontSize: { xs: '1.25rem', sm: '1.5rem' },
              transition: 'font-size 0.3s ease-in-out, color 0.3s ease-in-out', // Subtle animation
            }}
          >
            {bpm} BPM
          </Typography>
          {name && !/^(user|new user)$/i.test(name) && (
            <Typography
              variant="hrLabel"
              sx={{
                mt: 1, // Add some margin top to separate from BPM
                textOverflow: 'ellipsis', // Truncate with ellipsis
                whiteSpace: 'nowrap', // Prevent wrapping
                overflow: 'hidden', // Hide overflow content
              }}
            >
              {name}
            </Typography>
          )}
        </CardContent>
      </StyledCard>
    </Tooltip>
  )
}

export default memo(HrTile)
