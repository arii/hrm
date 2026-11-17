import { useEffect, useState } from 'react'
import Button from '@mui/material/Button'
import Link from '@mui/material/Link'
import Typography from '@mui/material/Typography'
import { formatConnectionLog } from '@/hooks/useBluetoothHRM/connectionLog'
import logger from '@/utils/logger'

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
export const CopyConnectionLogButton = () => {
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
