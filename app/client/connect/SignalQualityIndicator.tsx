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
  const theme = useTheme()

  // Determine stability for real-time feedback
  const getStability = () => {
    if (!isConnected || lastPeriodMs === 0) return 'Stable'
    if (lastPeriodMs > CRITICAL_THRESHOLD_MS) return 'Critical'
    if (lastPeriodMs > STABILITY_THRESHOLD_MS) return 'Warning'
    return 'Stable'
  }

  const stability = getStability()

  // Determine signal quality tier (based on average)
  let quality: 'excellent' | 'good' | 'poor' | 'none' = 'none'
  let color = theme.palette.text.disabled

  if (isConnected && periodMs > 0) {
    if (periodMs < 1200) {
      quality = 'excellent'
      color = theme.palette.success.main
    } else if (periodMs < 2200) {
      quality = 'good'
      color = theme.palette.warning.main
    } else {
      quality = 'poor'
      color = theme.palette.error.main
    }
  }

  // Override color if stability is compromised
  if (stability === 'Warning') color = theme.palette.warning.main
  if (stability === 'Critical') color = theme.palette.error.main

  const getIcon = () => {
    switch (quality) {
      case 'excellent':
        return <SignalCellularAltIcon sx={{ color }} />
      case 'good':
        return <SignalCellularAlt2BarIcon sx={{ color }} />
      case 'poor':
        return <SignalCellularAlt1BarIcon sx={{ color }} />
      default:
        return <SignalCellularConnectedNoInternet0BarIcon sx={{ color }} />
    }
  }

  // Calculate an approximate "Packet Success Rate" for the tooltip
  // Assuming 1000ms target.
  // 1000ms avg = ~100% success. 2000ms avg = ~50% success.
  const estimatedReliability = Math.min(
    100,
    Math.round((1000 / periodMs) * 100)
  )

  return (
    <Tooltip
      title={
        isConnected
          ? `Signal Quality: ${periodMs}ms avg period (~${estimatedReliability}% capture)${
              lastPeriodMs > STABILITY_THRESHOLD_MS
                ? ` | Latency: ${lastPeriodMs}ms`
                : ''
            }`
          : 'No Signal'
      }
      arrow
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
            '0%': { opacity: 1 },
            '50%': { opacity: 0.4 },
            '100%': { opacity: 1 },
          },
        }}
      >
        {getIcon()}
        {isConnected && (
          <Typography
            variant="caption"
            sx={{
              color: stability !== 'Stable' ? color : 'text.secondary',
              minWidth: 35,
              fontWeight: stability !== 'Stable' ? 'bold' : 'normal',
            }}
          >
            {stability === 'Critical'
              ? 'Signal Lost'
              : stability === 'Warning'
                ? 'Weak Signal'
                : `${periodMs}ms`}
          </Typography>
        )}
      </Box>
    </Tooltip>
  )
}
