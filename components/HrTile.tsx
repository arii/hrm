'use client'
import { HrTileProps } from '@/types'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Tooltip from '@mui/material/Tooltip'
import WifiOffIcon from '@mui/icons-material/WifiOff'
import Typography from '@mui/material/Typography'
import { memo } from 'react'
import { HR_ZONE_VISUAL_CONFIG } from '@/lib/shared/hr-zones'
import { useTheme } from '@mui/material/styles'
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

const IdentityTier = ({ name }: { name: string }) => (
  <Box sx={{ pt: 3, textAlign: 'center' }}>
    <Typography
      variant="h5"
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

const HeroTier = ({ percentMax }: { percentMax: number }) => (
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
      variant="h2"
      component="div"
      sx={{
        fontSize: 'clamp(4rem, 15cqw, 15rem)',
        fontWeight: 900,
        lineHeight: 1,
        fontFamily: HERO_FONT_FAMILY,
      }}
    >
      {percentMax}%
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
  bpm,
  calories,
  showName,
}: {
  bpm: number | null
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
    <MetricItem value={bpm ?? '---'} label="BPM" testId="bpm-value" />
    <MetricItem value={Math.floor(calories)} label="KCAL" />
  </Box>
)

const HrTile = ({
  name,
  bpm,
  percentMax,
  zone,
  calories = 0,
  isConnected = true,
  isDataStale = false,
  isAlerting = false,
  alertMessage = 'Checking signal...',
}: HrTileProps) => {
  const theme = useTheme()

  const zoneConfig =
    HR_ZONE_VISUAL_CONFIG[(zone ?? 0) as keyof typeof HR_ZONE_VISUAL_CONFIG] ||
    HR_ZONE_VISUAL_CONFIG[0]

  const tooltipTitle = isAlerting
    ? alertMessage
    : !isConnected
      ? 'Disconnected - Showing last known value'
      : isDataStale
        ? 'Waiting for data...'
        : `Name: ${name}, BPM: ${bpm}, Kcal: ${calories}, % Max HR: ${percentMax}%`

  const showName = !isGenericName(name)

  return (
    <Tooltip title={tooltipTitle} arrow>
      <ControlCard
        data-testid="hr-tile-card"
        role="region"
        aria-label={`Heart rate monitor for ${name}: ${
          isConnected ? `${bpm} beats per minute` : 'Disconnected'
        }, ${percentMax}% of maximum, Zone ${zone ?? 0}: ${zoneConfig.label}`}
        sx={{
          bgcolor: zoneConfig.color,
          color: zoneConfig.textColor,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
          opacity: isConnected && !isDataStale ? 1 : 0.6,
          transition: theme.transitions.create('opacity', {
            duration: theme.transitions.duration.short,
          }),
          containerType: 'inline-size',
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
            justifyContent: 'center',
          }}
        >
          {showName && <IdentityTier name={name} />}
          <HeroTier percentMax={percentMax} />
          <DataTier bpm={bpm} calories={calories} showName={showName} />
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
