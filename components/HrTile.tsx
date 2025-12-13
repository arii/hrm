// File: components/HrTile.tsx
'use client'
import { HrTileProps } from '@/types'
import Box from '@mui/material/Box'
import CardContent from '@mui/material/CardContent'
import CircularProgress from '@mui/material/CircularProgress'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { memo } from 'react'
import StyledCard from './shared/StyledCard'
import HeartRateZoneIndicator from './HeartRateZoneIndicator'

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
  maxHr,
  isAlerting, // NEW PROP
  alertMessage = 'Checking signal...', // Default message
}: HrT ileProps) => {
  return (
    <Tooltip
      title={
        isAlerting
          ? alertMessage
          : `Name: ${name}, BPM: ${bpm}`
      }
      arrow
    >
      <StyledCard
        data-testid="hr-tile-card"
        role="region"
        aria-label={`Heart rate monitor for ${name}: ${bpm} beats per minute`}
        sx={{
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
            <HeartRateZoneIndicator currentHr={bpm} maxHr={maxHr} />
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
    prevProps.maxHr === nextProps.maxHr &&
    prevProps.isAlerting === nextProps.isAlerting &&
    prevProps.alertMessage === nextProps.alertMessage
  )
}

export default memo(HrTile, arePropsEqual)