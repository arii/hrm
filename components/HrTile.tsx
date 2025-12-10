// File: components/HrTile.tsx
'use client'
import { HrTileProps } from '@/types'
import Box from '@mui/material/Box'
import CardContent from '@mui/material/CardContent'
import CircularProgress from '@mui/material/CircularProgress'
import Tooltip from '@mui/material/Tooltip'
import { getHrZoneProps } from '@/utils/visualization'
import Typography from '@mui/material/Typography'
import { memo } from 'react'
import StyledCard from './shared/StyledCard'

// Define the style for the centered overlay
const overlayStyles = {
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  backgroundColor: 'rgba(0, 0, 0, 0.7)', // Dark, semi-transparent overlay
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 10,
  borderRadius: 'inherit', // Match card border radius from StyledCard
}

const HrTile = ({
  name,
  bpm,
  percentMax,
  isAlerting, // NEW PROP
  alertMessage = 'Checking signal...', // Default message
}: HrTileProps) => {
  // Get HR zone props which include the theme-based background color
  // Note: We're passing a placeholder maxHr because the function currently requires it,
  // but it only uses the ratio (percentMax) to determine the zone color.
  // This could be refactored in getHrZoneProps to accept percentMax directly.
  const { backgroundColor } = getHrZoneProps(percentMax, 100)

  return (
    <Tooltip
      title={
        isAlerting
          ? alertMessage
          : `Name: ${name}, BPM: ${bpm}, % Max HR: ${percentMax}%`
      }
      arrow
    >
      <StyledCard
        data-testid="hr-tile-card"
        role="region"
        aria-label={`Heart rate monitor for ${name}: ${bpm} beats per minute, ${percentMax}% of maximum`}
        sx={{
          backgroundColor: backgroundColor,
          color: '#fff',
          textAlign: 'center',
          minHeight: 180,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          position: 'relative', // IMPORTANT: Allows the overlay to be absolutely positioned
        }}
      >
        {/* CONDITIONAL OVERLAY: Renders only when isAlerting is true. */}
        {isAlerting && (
          <Box sx={overlayStyles} data-testid="hr-tile-alert-overlay">
            <CircularProgress size={30} sx={{ color: 'white' }} />
            <Typography
              variant="caption"
              sx={{ mt: 1, color: 'white', textAlign: 'center' }}
            >
              {alertMessage}
            </Typography>
          </Box>
        )}
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
                // ADDED: Pulse animation
                animation: 'subtle-pulse 2s infinite ease-in-out',
                // Animate only when receiving live data (bpm > 0 and not in an alert state)
                animationPlayState:
                  bpm > 0 && !isAlerting ? 'running' : 'paused',
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
  // Re-render only if display data changes.
  return (
    prevProps.name === nextProps.name &&
    prevProps.bpm === nextProps.bpm &&
    prevProps.percentMax === nextProps.percentMax &&
    prevProps.isAlerting === nextProps.isAlerting &&
    prevProps.alertMessage === nextProps.alertMessage
  )
}

export default memo(HrTile, arePropsEqual)
