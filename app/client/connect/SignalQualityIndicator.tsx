import { Box, Palette, Tooltip, Typography, useTheme } from '@mui/material'
import SignalCellularAltIcon from '@mui/icons-material/SignalCellularAlt'
import SignalCellularAlt2BarIcon from '@mui/icons-material/SignalCellularAlt2Bar'
import SignalCellularAlt1BarIcon from '@mui/icons-material/SignalCellularAlt1Bar'
import SignalCellularConnectedNoInternet0BarIcon from '@mui/icons-material/SignalCellularConnectedNoInternet0Bar'
import { useMemo } from 'react'
import {
  STABILITY_THRESHOLD_MS,
  CRITICAL_THRESHOLD_MS,
} from '@/constants/bluetooth'

type SignalStatusKey =
  | 'critical'
  | 'warning'
  | 'excellent'
  | 'good'
  | 'poor'
  | 'none'

interface StatusConfig {
  color: string
  icon: typeof SignalCellularAltIcon
  isAnimated: boolean
  label?: string
}

const getStatusConfig = (
  key: SignalStatusKey,
  palette: Palette,
  periodMs: number,
  isConnected: boolean
): StatusConfig => {
  switch (key) {
    case 'critical':
      return {
        color: palette.error.main,
        label: 'Signal Lost',
        icon: SignalCellularConnectedNoInternet0BarIcon,
        isAnimated: true,
      }
    case 'warning':
      return {
        color: palette.warning.main,
        label: 'Weak Signal',
        icon: SignalCellularAlt1BarIcon,
        isAnimated: true,
      }
    case 'excellent':
      return {
        color: palette.success.main,
        label: `${periodMs}ms`,
        icon: SignalCellularAltIcon,
        isAnimated: false,
      }
    case 'good':
      return {
        color: palette.warning.main,
        label: `${periodMs}ms`,
        icon: SignalCellularAlt2BarIcon,
        isAnimated: false,
      }
    case 'poor':
      return {
        color: palette.error.main,
        label: `${periodMs}ms`,
        icon: SignalCellularAlt1BarIcon,
        isAnimated: false,
      }
    default:
      return {
        color: palette.text.disabled,
        label: isConnected ? 'Waiting...' : 'Disconnected',
        icon: SignalCellularConnectedNoInternet0BarIcon,
        isAnimated: false,
      }
  }
}

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

/**
 * Visualizes Bluetooth connection quality based on packet inter-arrival time.
 */
export const SignalQualityIndicator = ({
  periodMs,
  lastPeriodMs = 0,
  isConnected,
}: SignalQualityIndicatorProps) => {
  const { palette } = useTheme()

  const currentStatusKey = useMemo((): SignalStatusKey => {
    if (!isConnected || periodMs === 0) return 'none'
    if (lastPeriodMs > CRITICAL_THRESHOLD_MS) return 'critical'
    if (lastPeriodMs > STABILITY_THRESHOLD_MS) return 'warning'

    if (periodMs < 1200) return 'excellent'
    if (periodMs < 2200) return 'good'
    return 'poor'
  }, [isConnected, periodMs, lastPeriodMs])

  const config = useMemo(
    () => getStatusConfig(currentStatusKey, palette, periodMs, isConnected),
    [currentStatusKey, palette, periodMs, isConnected]
  )

  const Icon = config.icon
  const reliability =
    periodMs > 0 ? Math.min(100, Math.round(100000 / periodMs)) : 0

  return (
    <Tooltip
      arrow
      title={
        isConnected
          ? `Signal Quality: ${periodMs}ms avg (~${reliability}% capture)${
              currentStatusKey === 'warning' || currentStatusKey === 'critical'
                ? ` | Latency: ${lastPeriodMs}ms`
                : ''
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
              // Set a minWidth for ms labels to prevent jitter, but allow text labels to expand
              minWidth: config.label?.endsWith('ms') ? 45 : 'auto',
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
