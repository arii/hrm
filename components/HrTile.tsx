// File: components/HrTile.tsx
'use client'
import { HrTileProps } from '@/types'
import Box from '@mui/material/Box'
import CardActionArea from '@mui/material/CardActionArea'
import CardContent from '@mui/material/CardContent'
import CircularProgress from '@mui/material/CircularProgress'
import Tooltip from '@mui/material/Tooltip'
import WifiOffIcon from '@mui/icons-material/WifiOff'
import { getHrZoneProps } from '@/utils/visualization'
import Typography from '@mui/material/Typography'
import { memo } from 'react'
import StyledCard from './shared/StyledCard'
import { useTheme } from '@mui/material/styles'

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
  calories = 0, // Default to 0 to prevent NaN
  isConnected = true, // Default to connected
  isAlerting = false,
  alertMessage = 'Checking signal...',
}: HrTileProps) => {
  const theme = useTheme()
  const { backgroundColor, zoneName } = getHrZoneProps(percentMax, 100)

  const tooltipTitle = isAlerting
    ? alertMessage
    : !isConnected
      ? 'Disconnected - Showing last known value'
      : `Name: ${name}, BPM: ${bpm}, Kcal: ${calories}, % Max HR: ${percentMax}%`

  const accessibilityLabel = `Heart rate for ${name}: ${
    isConnected
      ? `${bpm} BPM, ${percentMax}% of max, Zone: ${zoneName}`
      : 'Disconnected'
  }`

  return (
    <StyledCard
      data-testid="hr-tile-card"
      sx={{
        backgroundColor: backgroundColor,
        color: '#fff',
        textAlign: 'center',
        minHeight: 220,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        position: 'relative',
        opacity: isConnected ? 1 : 0.65,
        transition: theme.transitions.create(['opacity', 'background-color'], {
          duration: theme.transitions.duration.short,
        }),
        '&:hover': {
          transform: 'scale(1.02)',
          boxShadow: theme.shadows[8],
        },
      }}
    >
      <CardActionArea
        aria-label={accessibilityLabel}
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}
      >
        {/* --- Disconnected Icon --- */}
        {!isConnected && (
          <WifiOffIcon
            sx={{
              position: 'absolute',
              top: theme.spacing(1.5),
              right: theme.spacing(1.5),
              fontSize: '2rem',
              color: 'rgba(255, 255, 255, 0.7)',
            }}
          />
        )}

        {/* --- Alerting Overlay --- */}
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

        <Box
          aria-live="polite"
          aria-atomic="true"
          sx={{ width: '100%', p: 2 }}
        >
          <CardContent sx={{ p: '0 !important' }}>
            <Typography
              data-testid="live-hr-percent"
              sx={{
                fontFamily: 'var(--font-roboto-mono), "Courier New", monospace',
                fontSize: { xs: '3.5rem', sm: '4rem', md: '5rem' },
                fontWeight: 700,
                lineHeight: 1,
                textShadow: '0 2px 4px rgba(0,0,0,0.25)',
                animation: 'subtle-pulse 2s infinite ease-in-out',
                animationPlayState:
                  bpm > 0 && !isAlerting && isConnected ? 'running' : 'paused',
              }}
            >
              {percentMax}%
            </Typography>
            <Typography
              variant="h5"
              component="div"
              sx={{
                fontWeight: 700,
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                px: 1,
              }}
            >
              {name}
            </Typography>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-around',
                alignItems: 'baseline',
                mt: 1,
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {bpm}{' '}
                <Typography
                  variant="caption"
                  component="span"
                  sx={{ opacity: 0.8 }}
                >
                  BPM
                </Typography>
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {Math.floor(calories)}{' '}
                <Typography
                  variant="caption"
                  component="span"
                  sx={{ opacity: 0.8 }}
                >
                  KCAL
                </Typography>
              </Typography>
            </Box>
          </CardContent>
        </Box>
      </CardActionArea>
    </StyledCard>
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
