// File: components/HrTile.tsx
'use client'
import Box from '@mui/material/Box'
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
  gradient: string
}

const HrTile = ({
  name,
  bpm,
  percentMax,
  background,
  gradient,
}: HrTileProps) => {
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
        <Box aria-live="polite" aria-atomic="true">
          <CardContent sx={{ p: 0 }}>
            {/* Giant Percentage - should dominate the tile */}
            <Typography
              data-testid="live-hr-percent"
              sx={{
                fontFamily: 'var(--font-roboto-mono), "Courier New", monospace',
                fontSize: { xs: '5rem', sm: '6rem', md: '7rem' },
                fontWeight: 900,
                lineHeight: 0.85,
                my: 0.5,
                textShadow: '0 2px 4px rgba(0,0,0,0.2)',
                background: gradient,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              {percentMax}%
            </Typography>
            <Typography
              data-testid="live-hr-value"
              variant="h6"
              sx={{
                fontWeight: 600,
                fontSize: { xs: '1.2rem', sm: '1.4rem', md: '1.6rem' },
                transition:
                  'font-size 0.3s ease-in-out, color 0.3s ease-in-out', // Subtle animation
              }}
            >
              {bpm} BPM
            </Typography>
            {name && !/^(user|new user)$/i.test(name) && (
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 700,
                  fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
                  letterSpacing: '0.05em',
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
        </Box>
      </StyledCard>
    </Tooltip>
  )
}

// Custom comparison function for React.memo
const arePropsEqual = (prevProps: HrTileProps, nextProps: HrTileProps) => {
  // Re-render only if display data (name, BPM, or zone-derived props) changes.
  return (
    prevProps.name === nextProps.name &&
    prevProps.bpm === nextProps.bpm &&
    prevProps.background === nextProps.background &&
    prevProps.percentMax === nextProps.percentMax
  )
}

export default memo(HrTile, arePropsEqual)
