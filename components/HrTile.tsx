'use client'
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
import { HrTileProps } from '@/types'
import { HR_TILE_MIN_HEIGHT, HERO_FONT_FAMILY } from '@/constants/layout'

const IdentityTier = ({ name }: { name: string }) => (
  <Box sx={{ pt: 1, textAlign: 'center' }}>
    <Typography
      data-testid="hr-tile-name"
      variant="h4"
      sx={{
        fontWeight: 900,
        fontSize: '1.5rem',
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
)

const HeroTier = ({ percentage }: { percentage: number }) => (
  <Box
    sx={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: 0,
    }}
  >
    <Typography
      data-testid="bpm-percent"
      variant="h2"
      component="div"
      sx={{
        fontSize: {
          xs: 'clamp(2.25rem, 10vw, 3rem)',
          sm: 'clamp(3rem, 12vw, 3.75rem)',
          md: 'clamp(3.75rem, 15vw, 4.5rem)',
        },
        fontWeight: 900,
        lineHeight: 1,
        fontFamily: HERO_FONT_FAMILY,
      }}
    >
      {percentage}%
    </Typography>
  </Box>
)

const MetricItem = ({
  value,
  label,
  testId,
}: {
  value: React.ReactNode
  label: string
  testId?: string
}) => (
  <Typography
    data-testid={testId}
    variant="h4"
    sx={{ fontWeight: 800, fontSize: '1.5rem' }}
  >
    {value}{' '}
    <Typography
      component="span"
      variant="caption"
      sx={{ fontSize: '1rem', fontWeight: 700, opacity: 0.9 }}
    >
      {label}
    </Typography>
  </Typography>
)

const DataTier = ({
  value,
  calories,
  showName,
}: {
  value: number | null
  calories: number
  showName: boolean
}) => (
  <Box
    sx={{
      pb: 1,
      pt: showName ? 0 : 1,
      display: 'flex',
      justifyContent: 'center',
      gap: 4,
    }}
  >
    <MetricItem value={value ?? '---'} label="BPM" testId="bpm-value" />
    <MetricItem
      value={Math.floor(calories)}
      label="KCAL"
      testId="calories-value"
    />
  </Box>
)

/**
 * Heart Rate Tile Component
 * Displays real-time heart rate, percentage of max HR, and calories burned.
 * Adapts its visual state based on connection status and data staleness.
 */
const HrTile = ({
  name = '',
  value = null,
  percentage = 0,
  zone = 'ZONE_0',
  calories = 0,
  isConnected = true,
  isAlerting = false,
  alertMessage = 'Checking signal...',
}: HrTileProps) => {
  const theme = useTheme()

  const zoneConfig =
    HR_ZONE_CONFIG[zone as HeartRateZone] || HR_ZONE_CONFIG.ZONE_0

  const tooltipTitle = isAlerting
    ? alertMessage
    : !isConnected
      ? 'Disconnected - Showing last known value'
      : `Name: ${name}, BPM: ${value ?? '---'}, Kcal: ${calories}, % Max HR: ${percentage}%`

  const showName = !isGenericName(name)

  const overlaySx = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: alpha(theme.palette.common.black, 0.7),
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    borderRadius: 'inherit',
  }

  return (
    <Tooltip title={tooltipTitle} arrow>
      <ControlCard
        data-testid="hr-tile-card"
        role="region"
        aria-label={`Heart rate monitor for ${name || 'User'}: ${
          isConnected ? `${value ?? '---'} beats per minute` : 'Disconnected'
        }, ${percentage}% of maximum, Zone ${zoneConfig.zoneNumber}: ${zoneConfig.label}`}
        sx={{
          bgcolor: zoneConfig.color,
          color: zoneConfig.textColor,
          minHeight: HR_TILE_MIN_HEIGHT,
          // Ensure the tile fills the container height in the grid
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
          padding: 0,
          opacity: isConnected ? 1 : 0.6,
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
          <Box data-testid="hr-tile-alert-overlay" sx={overlaySx}>
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
          sx={{
            flexGrow: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            p: 1.5,
          }}
        >
          {showName && <IdentityTier name={name} />}
          {/* Ticking digits are visual-only: a live region here would
              announce every 1Hz update. Zone transitions go to the
              dedicated announcer below, whose text only changes on
              transition. */}
          <Box data-testid="hr-tile-data" aria-hidden="true">
            <HeroTier percentage={percentage} />
            <DataTier value={value} calories={calories} showName={showName} />
          </Box>
          <Box
            data-testid="hr-tile-announcer"
            aria-live="polite"
            aria-atomic="true"
            sx={{
              position: 'absolute',
              width: '1px',
              height: '1px',
              padding: 0,
              margin: '-1px',
              overflow: 'hidden',
              clip: 'rect(0, 0, 0, 0)',
              whiteSpace: 'nowrap',
              border: 0,
            }}
          >
            {`Zone ${zoneConfig.zoneNumber}: ${zoneConfig.label}`}
          </Box>
        </Box>

        <Box sx={{ bgcolor: 'common.black', py: 1, textAlign: 'center' }}>
          <Typography
            variant="h6"
            sx={{ color: '#FFF', fontWeight: 900, letterSpacing: '0.3em' }}
          >
            {zoneConfig.label.toUpperCase()}
          </Typography>
        </Box>
      </ControlCard>
    </Tooltip>
  )
}

export default memo(HrTile)
