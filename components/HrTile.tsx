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
import { isGenericName } from '@/utils/hrm'

/**
 * Identity Tier: Displays the user name if it's not generic.
 */
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

/**
 * Hero Tier: Displays the massive heart rate percentage.
 */
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
      variant="h1"
      component="div"
      sx={{
        fontSize: { xs: '8rem', sm: '12rem', md: '15rem' },
        fontWeight: 900,
        lineHeight: 1,
        fontFamily: 'var(--font-roboto-mono), "Courier New", monospace',
      }}
    >
      {percentMax}%
    </Typography>
  </Box>
)

/**
 * Data Tier: Displays consolidated BPM and KCAL metrics.
 */
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
      pt: showName ? 0 : 3, // Balance spacing if name is missing
      display: 'flex',
      justifyContent: 'center',
      gap: 4,
    }}
  >
    <Typography data-testid="bpm-value" variant="h4" sx={{ fontWeight: 800 }}>
      {bpm ?? '---'}{' '}
      <Typography
        component="span"
        variant="caption"
        sx={{ fontSize: '1.2rem', opacity: 0.8 }}
      >
        BPM
      </Typography>
    </Typography>
    <Typography variant="h4" sx={{ fontWeight: 800 }}>
      {Math.floor(calories)}{' '}
      <Typography
        component="span"
        variant="caption"
        sx={{ fontSize: '1.2rem', opacity: 0.8 }}
      >
        KCAL
      </Typography>
    </Typography>
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

  const displayZone = zone ?? 0
  const zoneConfig =
    HR_ZONE_VISUAL_CONFIG[displayZone as keyof typeof HR_ZONE_VISUAL_CONFIG] ||
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
      <Card
        data-testid="hr-tile-card"
        role="region"
        aria-label={`Heart rate monitor for ${name}: ${
          isConnected ? `${bpm} beats per minute` : 'Disconnected'
        }, ${percentMax}% of maximum, Zone ${displayZone}: ${zoneConfig.label}`}
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
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
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
      </Card>
    </Tooltip>
  )
}

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
