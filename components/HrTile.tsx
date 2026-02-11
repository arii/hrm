// File: components/HrTile.tsx
'use client'
import { HrTileProps } from '@/types'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CircularProgress from '@mui/material/CircularProgress'
import Tooltip from '@mui/material/Tooltip'
import WifiOffIcon from '@mui/icons-material/WifiOff'
import Typography from '@mui/material/Typography'
import { memo } from 'react'
import { HR_ZONE_VISUAL_CONFIG } from '@/lib/shared/hr-zones'
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
  borderRadius: 'inherit',
}

const HrTile = ({
  name,
  bpm,
  percentMax,
  zone,
  calories = 0, // Default to 0 to prevent NaN
  isConnected = true, // Default to connected
  isDataStale = false,
  isAlerting = false,
  alertMessage = 'Checking signal...',
}: HrTileProps) => {
  const theme = useTheme()

  // Determine the effective zone.
  // If 'zone' is provided (server-calculated), use it.
  const displayZone = zone ?? 0

  const zoneConfig =
    HR_ZONE_VISUAL_CONFIG[displayZone as keyof typeof HR_ZONE_VISUAL_CONFIG] ||
    HR_ZONE_VISUAL_CONFIG[0]

  const backgroundColor = zoneConfig.color

  const tooltipTitle = isAlerting
    ? alertMessage
    : !isConnected
      ? 'Disconnected - Showing last known value'
      : isDataStale
        ? 'Waiting for data...'
        : `Name: ${name}, BPM: ${bpm}, Kcal: ${calories}, % Max HR: ${percentMax}%`

  return (
    <Tooltip title={tooltipTitle} arrow>
      <Card
        data-testid="hr-tile-card"
        role="region"
        aria-label={`Heart rate monitor for ${name}: ${
          isConnected ? `${bpm} beats per minute` : 'Disconnected'
        }, ${percentMax}% of maximum, Zone ${displayZone}: ${zoneConfig.label}`}
        sx={{
          bgcolor: backgroundColor,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 4,
          position: 'relative',
          overflow: 'hidden',
          opacity: isConnected && !isDataStale ? 1 : 0.6,
          transition: theme.transitions.create('opacity', {
            duration: theme.transitions.duration.short,
          }),
        }}
      >
        {/* --- Disconnected Icon --- */}
        {!isConnected && (
          <WifiOffIcon
            sx={{
              position: 'absolute',
              top: theme.spacing(1),
              right: theme.spacing(1),
              fontSize: '1.5rem',
              color: theme.palette.warning.main,
              zIndex: 5,
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

        {/* TOP: Identity Tier - Scaled up for visibility */}
        <Box sx={{ pt: 3, textAlign: 'center' }}>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 900,
              color: '#FFF',
              textTransform: 'uppercase',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              px: 2,
            }}
          >
            {name}
          </Typography>
        </Box>

        {/* CENTER: Hero Tier - Maximum font-size */}
        <Box
          sx={{
            flexGrow: 1,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Typography
            data-testid="live-hr-percent"
            variant="h1"
            sx={{
              fontSize: { xs: '8rem', sm: '12rem', md: '15rem' },
              fontWeight: 950,
              color: '#FFF',
              lineHeight: 1,
              fontFamily: 'var(--font-roboto-mono), "Courier New", monospace',
            }}
          >
            {percentMax}%
          </Typography>
        </Box>

        {/* BOTTOM: Consolidated Data Tier */}
        <Box sx={{ pb: 3, display: 'flex', justifyContent: 'center', gap: 4 }}>
          <Typography
            data-testid="bpm-value"
            variant="h4"
            sx={{ fontWeight: 800, color: '#FFF' }}
          >
            {bpm ?? '---'}{' '}
            <small style={{ fontSize: '1.2rem', opacity: 0.8 }}>BPM</small>
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#FFF' }}>
            {Math.floor(calories)}{' '}
            <small style={{ fontSize: '1.2rem', opacity: 0.8 }}>KCAL</small>
          </Typography>
        </Box>

        {/* FOOTER: Black Anchor Bar */}
        <Box sx={{ bgcolor: 'common.black', py: 2, textAlign: 'center' }}>
          <Typography
            variant="h6"
            sx={{ color: '#FFF', fontWeight: 900, letterSpacing: '0.3em' }}
          >
            {zoneConfig.label.toUpperCase()}
          </Typography>
        </Box>
      </Card>
    </Tooltip>
  )
}

// Custom comparison function for React.memo
const arePropsEqual = (prevProps: HrTileProps, nextProps: HrTileProps) => {
  return (
    prevProps.name === nextProps.name &&
    prevProps.bpm === nextProps.bpm &&
    prevProps.percentMax === nextProps.percentMax &&
    prevProps.zone === nextProps.zone &&
    prevProps.calories === nextProps.calories &&
    prevProps.isConnected === nextProps.isConnected &&
    prevProps.isDataStale === nextProps.isDataStale &&
    prevProps.isAlerting === nextProps.isAlerting &&
    prevProps.alertMessage === nextProps.alertMessage
  )
}

export default memo(HrTile, arePropsEqual)
