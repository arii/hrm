'use client'
import { HrTileProps } from '@/types'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Tooltip from '@mui/material/Tooltip'
import WifiOffIcon from '@mui/icons-material/WifiOff'
import Typography from '@mui/material/Typography'
import { memo } from 'react'
import { HR_ZONE_CONFIG, HeartRateZone } from '@/lib/shared/hr-zones'
import { useTheme, alpha } from '@mui/material/styles'
import { isGenericName } from '@/utils/hrm'
import ControlCard from '@/components/shared/ControlCard'

const HERO_FONT_FAMILY = 'var(--font-roboto-mono), "Courier New", monospace'

const OVERLAY_SX = {
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  backgroundColor: 'rgba(0, 0, 0, 0.7)',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 10,
  borderRadius: 'inherit',
} as const

const HrTile = ({
  name,
  value,
  percentage,
  zone,
  calories = 0,
  isConnected = true,
  isDataStale = false,
  isAlerting = false,
  alertMessage = 'Checking signal...',
}: HrTileProps) => {
  const theme = useTheme()
  const showName = !isGenericName(name)

  const zoneConfig =
    HR_ZONE_CONFIG[(zone ?? 'ZONE_0') as HeartRateZone] || HR_ZONE_CONFIG.ZONE_0

  const tooltipTitle = isAlerting
    ? alertMessage
    : !isConnected
      ? 'Disconnected - Showing last known value'
      : isDataStale
        ? 'Waiting for data...'
        : `Name: ${name}, BPM: ${value}, Kcal: ${calories}, % Max HR: ${percentage}%`

  return (
    <Tooltip title={tooltipTitle} arrow>
      <ControlCard
        data-testid="hr-tile-card"
        role="region"
        aria-label={`Heart rate monitor for ${name}: ${
          isConnected ? `${value} beats per minute` : 'Disconnected'
        }, ${percentage}% of maximum, Zone ${zoneConfig.zoneNumber}: ${zoneConfig.label}`}
        sx={{
          bgcolor: zoneConfig.color,
          color: zoneConfig.textColor,
          minHeight: { xs: theme.spacing(13.75), md: theme.spacing(16.25) },
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
          padding: 0,
          opacity: isConnected && !isDataStale ? 1 : 0.6,
          transition: theme.transitions.create('opacity', {
            duration: theme.transitions.duration.short,
          }),
        }}
      >
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

        {isAlerting && (
          <Box data-testid="hr-tile-alert-overlay" sx={OVERLAY_SX}>
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
          sx={{
            flexGrow: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            p: 1.5,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              justifyContent: showName ? 'space-between' : 'center',
              alignItems: 'baseline',
            }}
          >
            {showName && (
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: '60%',
                }}
              >
                {name}
              </Typography>
            )}
            <Typography
              data-testid="live-hr-percent"
              variant="h4"
              sx={{
                fontWeight: 900,
                fontFamily: HERO_FONT_FAMILY,
                textAlign: showName ? 'right' : 'center',
                flexGrow: showName ? 0 : 1,
              }}
            >
              {percentage}%
            </Typography>
          </Box>

          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-around',
              bgcolor: alpha(theme.palette.common.white, 0.1),
              borderRadius: 1,
              py: 0.5,
            }}
          >
            <Box textAlign="center">
              <Typography
                data-testid="bpm-value"
                variant="body1"
                sx={{ fontWeight: 800 }}
              >
                {value ?? '---'}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  opacity: 0.7,
                  fontSize: '0.6rem',
                  display: 'block',
                  mt: -0.5,
                }}
              >
                BPM
              </Typography>
            </Box>
            <Box textAlign="center">
              <Typography variant="body1" sx={{ fontWeight: 800 }}>
                {Math.floor(calories)}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  opacity: 0.7,
                  fontSize: '0.6rem',
                  display: 'block',
                  mt: -0.5,
                }}
              >
                KCAL
              </Typography>
            </Box>
          </Box>
        </Box>

        <Box sx={{ bgcolor: 'common.black', py: 0.5, textAlign: 'center' }}>
          <Typography
            variant="caption"
            sx={{
              color: '#FFF',
              fontWeight: 900,
              letterSpacing: '0.2em',
              display: 'block',
            }}
          >
            {zoneConfig.label.toUpperCase()}
          </Typography>
        </Box>
      </ControlCard>
    </Tooltip>
  )
}

export default memo(HrTile)
