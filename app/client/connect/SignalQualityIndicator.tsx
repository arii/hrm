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
  isConnected: boolean
}

const CRITICAL_THRESHOLD_MS = 2200
const STABILITY_THRESHOLD_MS = 1200

/**
 * Visualizes Bluetooth connection quality based on packet inter-arrival time.
 */
export const SignalQualityIndicator = ({
  periodMs,
  isConnected,
}: SignalQualityIndicatorProps) => {
  const theme = useTheme()

  // Determine signal quality tier
  // Ideally: ~1000ms.
  // Acceptable jitter: +/- 20% (800ms - 1200ms)
  // Dropped packet: > 1800ms
  let quality: 'excellent' | 'good' | 'poor' | 'none' = 'none'
  let color = theme.palette.text.disabled

  if (isConnected && periodMs > 0) {
    if (periodMs < STABILITY_THRESHOLD_MS) {
      quality = 'excellent'
      color = theme.palette.success.main
    } else if (periodMs < CRITICAL_THRESHOLD_MS) {
      // Likely missing every other packet
      quality = 'good'
      color = theme.palette.warning.main
    } else {
      // Missing multiple packets in a row
      quality = 'poor'
      color = theme.palette.error.main
    }
  }

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
          ? `Signal Quality: ${periodMs}ms avg period (~${estimatedReliability}% capture)`
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
        }}
      >
        {getIcon()}
        {isConnected && (
          <Typography
            variant="caption"
            sx={{ color: 'text.secondary', minWidth: 35 }}
          >
            {periodMs}ms
          </Typography>
        )}
      </Box>
    </Tooltip>
  )
}
