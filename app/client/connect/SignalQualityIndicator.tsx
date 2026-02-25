import { Box, Tooltip, Typography, useTheme } from '@mui/material'
import SignalCellularAltIcon from '@mui/icons-material/SignalCellularAlt'
import SignalCellularAlt2BarIcon from '@mui/icons-material/SignalCellularAlt2Bar'
import SignalCellularAlt1BarIcon from '@mui/icons-material/SignalCellularAlt1Bar'
import SignalCellularConnectedNoInternet0BarIcon from '@mui/icons-material/SignalCellularConnectedNoInternet0Bar'

interface SignalQualityIndicatorProps {
  /**
   * The average time in milliseconds between received Bluetooth packets.
   * Standard BLE HR profile is typically ~1000ms (1Hz).
   */
  periodMs: number
  /**
   * The most recent packet inter-arrival time for real-time jitter detection.
   */
  lastPeriodMs?: number
  isConnected: boolean
}

const STABILITY_THRESHOLD_MS = 1500
const CRITICAL_THRESHOLD_MS = 3000

/**
 * Visualizes Bluetooth connection quality based on packet inter-arrival time.
 */
export const SignalQualityIndicator = ({
  periodMs,
  lastPeriodMs = 0,
  isConnected,
}: SignalQualityIndicatorProps) => {
  const { palette } = useTheme()
  const isCritical = isConnected && lastPeriodMs > CRITICAL_THRESHOLD_MS
  const isWarning = isConnected && lastPeriodMs > STABILITY_THRESHOLD_MS

  const quality =
    !isConnected || periodMs === 0
      ? 'none'
      : periodMs < 1200
        ? 'excellent'
        : periodMs < 2200
          ? 'good'
          : 'poor'

  const STATUS_CONFIG = {
    critical: {
      color: palette.error.main,
      label: 'Signal Lost',
      icon: SignalCellularConnectedNoInternet0BarIcon,
      isAnimated: true,
    },
    warning: {
      color: palette.warning.main,
      label: 'Weak Signal',
      icon: SignalCellularAlt1BarIcon,
      isAnimated: true,
    },
    excellent: {
      color: palette.success.main,
      label: `${periodMs}ms`,
      icon: SignalCellularAltIcon,
      isAnimated: false,
    },
    good: {
      color: palette.warning.main,
      label: `${periodMs}ms`,
      icon: SignalCellularAlt2BarIcon,
      isAnimated: false,
    },
    poor: {
      color: palette.error.main,
      label: `${periodMs}ms`,
      icon: SignalCellularAlt1BarIcon,
      isAnimated: false,
    },
    none: {
      color: palette.text.disabled,
      label: 'Disconnected',
      icon: SignalCellularConnectedNoInternet0BarIcon,
      isAnimated: false,
    },
  } as const

  const currentStatusKey = isCritical
    ? 'critical'
    : isWarning
      ? 'warning'
      : quality

  const config = STATUS_CONFIG[currentStatusKey]
  const Icon = config.icon
  const reliability = Math.min(100, Math.round(100000 / (periodMs || 1000)))

  return (
    <Tooltip
      arrow
      title={
        isConnected
          ? `Signal Quality: ${periodMs}ms avg (~${reliability}% capture)${
              isWarning ? ` | Latency: ${lastPeriodMs}ms` : ''
            }`
          : 'No Signal'
      }
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          opacity: isConnected ? 1 : 0.5,
          color: config.color,
          animation: config.isAnimated ? 'pulse-signal 1.5s infinite' : 'none',
          // Keyframes are defined in global styles to avoid re-parsing on every render
        }}
      >
        <Icon />
        {isConnected && (
          <Typography
            variant="caption"
            sx={{
              color: config.isAnimated ? config.color : 'text.secondary',
              minWidth: 35,
              fontWeight: config.isAnimated ? 'bold' : 'normal',
            }}
          >
            {config.label}
          </Typography>
        )}
      </Box>
    </Tooltip>
  )
}
