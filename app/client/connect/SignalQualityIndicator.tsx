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
  const stability = isCritical ? 'Critical' : isWarning ? 'Warning' : 'Stable'

  const quality =
    !isConnected || periodMs === 0
      ? 'none'
      : periodMs < 1200
        ? 'excellent'
        : periodMs < 2200
          ? 'good'
          : 'poor'

  const color =
    isCritical || quality === 'poor'
      ? palette.error.main
      : isWarning || quality === 'good'
        ? palette.warning.main
        : quality === 'excellent'
          ? palette.success.main
          : palette.text.disabled

  const Icon =
    {
      excellent: SignalCellularAltIcon,
      good: SignalCellularAlt2BarIcon,
      poor: SignalCellularAlt1BarIcon,
      none: SignalCellularConnectedNoInternet0BarIcon,
    }[quality] || SignalCellularConnectedNoInternet0BarIcon

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
          color,
          animation:
            stability !== 'Stable' ? 'pulse-signal 1.5s infinite' : 'none',
          '@keyframes pulse-signal': {
            '0%, 100%': { opacity: 1 },
            '50%': { opacity: 0.4 },
          },
        }}
      >
        <Icon sx={{ color }} />
        {isConnected && (
          <Typography
            variant="caption"
            sx={{
              color: stability !== 'Stable' ? color : 'text.secondary',
              minWidth: 35,
              fontWeight: stability !== 'Stable' ? 'bold' : 'normal',
            }}
          >
            {isCritical
              ? 'Signal Lost'
              : isWarning
                ? 'Weak Signal'
                : `${periodMs}ms`}
          </Typography>
        )}
      </Box>
    </Tooltip>
  )
}
