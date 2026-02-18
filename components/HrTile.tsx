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

const IdentityTier = ({ name }: { name: string }) => (
  <Box sx={{ pt: 3, textAlign: 'center' }}>
    <Typography
      variant="h4"
      sx={{
        fontWeight: 900,
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
    }}
  >
    <Typography
      data-testid="live-hr-percent"
      variant="h2"
      component="div"
      sx={{
        fontSize: {
          xs: 'clamp(3rem, 10vw, 4rem)',
          sm: 'clamp(4rem, 12vw, 5rem)',
          md: 'clamp(5rem, 15vw, 6rem)',
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
  <Typography data-testid={testId} variant="h4" sx={{ fontWeight: 800 }}>
    {value}{' '}
    <Typography
      component="span"
      variant="caption"
      sx={{ fontSize: '1.2rem', opacity: 0.8 }}
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
      pb: 3,
      pt: showName ? 0 : 3,
      display: 'flex',
      justifyContent: 'center',
      gap: 4,
    }}
  >
    <MetricItem value={value ?? '---'} label="BPM" testId="bpm-value" />
    <MetricItem value={Math.floor(calories)} label="KCAL" />
  </Box>
)

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

  const zoneConfig =
    HR_ZONE_CONFIG[(zone ?? 'ZONE_0') as HeartRateZone] || HR_ZONE_CONFIG.ZONE_0

  const tooltipTitle = isAlerting
    ? alertMessage
    : !isConnected
      ? 'Disconnected - Showing last known value'
      : isDataStale
        ? 'Waiting for data...'
        : `Name: ${name}, BPM: ${value}, Kcal: ${calories}, % Max HR: ${percentage}%`

  const showName = !isGenericName(name)

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
          minHeight: theme.spacing(22.5),
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
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
          <Box
            data-testid="hr-tile-alert-overlay"
            sx={{
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
            }}
          >
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
            justifyContent: 'center',
            p: 2,
          }}
        >
          {showName && <IdentityTier name={name} />}
          <HeroTier percentage={percentage} />
          <DataTier value={value} calories={calories} showName={showName} />
        </Box>

        <Box sx={{ bgcolor: 'common.black', py: 2, textAlign: 'center' }}>
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
