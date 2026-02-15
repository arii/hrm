'use client'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Tooltip from '@mui/material/Tooltip'
import WifiOffIcon from '@mui/icons-material/WifiOff'
import Typography from '@mui/material/Typography'
import { memo } from 'react'
import { HR_ZONE_CONFIG, HeartRateZone } from '@/lib/shared/hr-zones'
import { useTheme } from '@mui/material/styles'
import { isGenericName } from '@/utils/hrm'
import ControlCard from '@/components/shared/ControlCard'

export interface HrTileProps {
  name: string
  bpm?: number | null
  value?: number | null
  percentMax?: number
  percentage?: number
  zone?: number
  calories?: number
  isConnected?: boolean
  isDataStale?: boolean
  isAlerting?: boolean
  alertMessage?: string
}

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

<<<<<<< HEAD
=======
<<<<<<< HEAD
=======
>>>>>>> be5484dc (refactor: consolidate redundant hooks and components)
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

<<<<<<< HEAD
const HeroTier = ({ percentage }: { percentage: number }) => (
=======
const HeroTier = ({ percentMax }: { percentMax: number }) => (
>>>>>>> be5484dc (refactor: consolidate redundant hooks and components)
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
        fontSize: {
          xs: 'clamp(5rem, 15vw, 8rem)',
          sm: 'clamp(8rem, 18vw, 12rem)',
          md: 'clamp(10rem, 20vw, 15rem)',
        },
        fontWeight: 900,
        lineHeight: 1,
        fontFamily: HERO_FONT_FAMILY,
      }}
    >
<<<<<<< HEAD
      {percentage}%
=======
      {percentMax}%
>>>>>>> be5484dc (refactor: consolidate redundant hooks and components)
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
<<<<<<< HEAD
  value,
  calories,
  showName,
}: {
  value: number | null
=======
  bpm,
  calories,
  showName,
}: {
  bpm: number | null
>>>>>>> be5484dc (refactor: consolidate redundant hooks and components)
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
<<<<<<< HEAD
    <MetricItem value={value ?? '---'} label="BPM" testId="bpm-value" />
=======
    <MetricItem value={bpm ?? '---'} label="BPM" testId="bpm-value" />
>>>>>>> be5484dc (refactor: consolidate redundant hooks and components)
    <MetricItem value={Math.floor(calories)} label="KCAL" />
  </Box>
)

<<<<<<< HEAD
const HrTile = ({
  name,
  value,
  percentage,
  zone,
=======
/**
 * HrTile Component: Displays real-time heart rate data for a single user.
 * Consolidates the presentation logic for heart rate, zones, and calories.
 */
>>>>>>> 82a421b9 (refactor: consolidate redundant hooks and components)
const HrTile = ({
  name,
  bpm,
  value,
  percentMax,
  percentage,
  zone = 0,
>>>>>>> be5484dc (refactor: consolidate redundant hooks and components)
  calories = 0,
  isConnected = true,
  isDataStale = false,
  isAlerting = false,
  alertMessage = 'Checking signal...',
}: HrTileProps) => {
  const theme = useTheme()

  // Support both property naming conventions (bpm/value and percentMax/percentage)
  const displayBpm = value !== undefined ? value : (bpm ?? null)
  const displayPercent = percentage !== undefined ? percentage : (percentMax ?? 0)

  const zoneConfig =
    HR_ZONE_CONFIG[(zone ?? 'ZONE_0') as HeartRateZone] || HR_ZONE_CONFIG.ZONE_0

  const tooltipTitle = isAlerting
    ? alertMessage
    : !isConnected
      ? 'Disconnected - Showing last known value'
      : isDataStale
        ? 'Waiting for data...'
<<<<<<< HEAD
        : `Name: ${name}, BPM: ${value}, Kcal: ${calories}, % Max HR: ${percentage}%`
=======
        : `Name: ${name}, BPM: ${displayBpm}, Kcal: ${calories}, % Max HR: ${displayPercent}%`
>>>>>>> be5484dc (refactor: consolidate redundant hooks and components)

  const showName = !isGenericName(name)

  return (
    <Tooltip title={tooltipTitle} arrow>
      <ControlCard
        data-testid="hr-tile-card"
        role="region"
        aria-label={`Heart rate monitor for ${name}: ${
<<<<<<< HEAD
          isConnected ? `${value} beats per minute` : 'Disconnected'
        }, ${percentage}% of maximum, Zone ${zoneConfig.zoneNumber}: ${zoneConfig.label}`}
        sx={{
          bgcolor: zoneConfig.color,
          color: zoneConfig.textColor,
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
            justifyContent: 'center',
            p: 2,
          }}
        >
<<<<<<< HEAD
          {showName && <IdentityTier name={name} />}
          <HeroTier percentage={percentage} />
          <DataTier value={value} calories={calories} showName={showName} />
=======
<<<<<<< HEAD
          {showName && (
            <Box sx={{ pt: 1, textAlign: 'center' }}>
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
          )}

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
                fontSize: {
                  xs: 'clamp(5rem, 15vw, 8rem)',
                  sm: 'clamp(8rem, 18vw, 12rem)',
                  md: 'clamp(10rem, 20vw, 15rem)',
                },
                fontWeight: 900,
                lineHeight: 1,
                fontFamily: HERO_FONT_FAMILY,
              }}
            >
              {percentMax}%
            </Typography>
          </Box>

          <Box
            sx={{
              pb: 1,
              display: 'flex',
              justifyContent: 'center',
              gap: 4,
            }}
          >
            <Typography
              data-testid="bpm-value"
              variant="h4"
              sx={{ fontWeight: 800 }}
            >
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
=======
          {showName && <IdentityTier name={name} />}
          <HeroTier percentMax={displayPercent} />
          <DataTier bpm={displayBpm} calories={calories} showName={showName} />
>>>>>>> 82a421b9 (refactor: consolidate redundant hooks and components)
>>>>>>> be5484dc (refactor: consolidate redundant hooks and components)
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
