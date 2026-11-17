import { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Collapse from '@mui/material/Collapse'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import Link from '@mui/material/Link'
import Typography from '@mui/material/Typography'
import { formatConnectionLog } from '@/hooks/useBluetoothHRM/connectionLog'
import logger from '@/utils/logger'
import { SignalQualityIndicator } from '../SignalQualityIndicator'

const COPY_LABEL_RESET_MS = 2500

const labels = {
  idle: 'Copy connection log',
  copied: 'Connection log copied',
  failed: 'Copy failed',
} as const

/**
 * Copies the timestamped Bluetooth log for this tab, the console
 * replacement for hardware tests on devices without DevTools.
 */
const CopyConnectionLogButton = () => {
  const [state, setState] = useState<keyof typeof labels>('idle')

  useEffect(() => {
    if (state === 'idle') return undefined
    const timer = setTimeout(() => setState('idle'), COPY_LABEL_RESET_MS)
    return () => clearTimeout(timer)
  }, [state])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(formatConnectionLog())
      setState('copied')
    } catch (error) {
      logger.warn({ error }, 'Copying the connection log failed')
      setState('failed')
    }
  }

  return (
    <Button
      data-testid="copy-connection-log"
      size="small"
      onClick={() => void copy()}
      sx={{ minHeight: 44 }}
    >
      {labels[state]}
    </Button>
  )
}

/** Last resort, shown only after in-page recovery has given up. */
export const ReloadFallback = () => (
  <Typography
    data-testid="reload-fallback"
    variant="body2"
    color="text.secondary"
    sx={{ mt: 1 }}
  >
    Still stuck?{' '}
    <Link
      component="button"
      variant="body2"
      onClick={() => window.location.reload()}
      sx={{ minHeight: 44, verticalAlign: 'baseline' }}
    >
      Reload page
    </Link>
  </Typography>
)

/**
 * Technical diagnostics, collapsed so the live numbers lead the page.
 */
export const ConnectionDetails = ({
  isConnected,
  signalPeriodMs,
  lastPeriodMs,
  connectionStatus,
}: {
  isConnected: boolean
  signalPeriodMs: number
  lastPeriodMs: number
  connectionStatus: string
}) => {
  const [open, setOpen] = useState(false)

  return (
    <Box sx={{ textAlign: 'center', mt: 3 }}>
      <Button
        size="small"
        color="inherit"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="connection-details"
        endIcon={
          <ExpandMoreIcon
            sx={{
              transform: open ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.2s',
            }}
          />
        }
        sx={{ minHeight: 44, color: 'text.secondary' }}
      >
        Connection details
      </Button>
      <Collapse in={open} id="connection-details">
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 1,
            pt: 1,
          }}
        >
          {isConnected && (
            <SignalQualityIndicator
              periodMs={signalPeriodMs}
              lastPeriodMs={lastPeriodMs}
              isConnected={isConnected}
            />
          )}
          <CopyConnectionLogButton />
          <Typography variant="body2" color="text.secondary">
            WebSocket: {connectionStatus}
          </Typography>
        </Box>
      </Collapse>
    </Box>
  )
}
