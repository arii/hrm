'use client'
import { useWebSocket } from '@/context/WebSocketContext'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

export const TimerConnectionStatus = () => {
  const { connectionStatus } = useWebSocket()

  return (
    <Box
      sx={{
        position: 'absolute',
        top: 16,
        right: 16,
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        zIndex: 2,
      }}
    >
      <Typography
        variant="caption"
        sx={{ color: 'inherit' }}
        data-testid="ws-status-indicator"
      >
        {connectionStatus}
      </Typography>
      <Box
        sx={{
          width: 12,
          height: 12,
          borderRadius: '50%',
          backgroundColor:
            connectionStatus === 'Connected'
              ? 'success.main'
              : connectionStatus === 'Reconnecting...'
                ? 'warning.main'
                : 'error.main',
          animation:
            connectionStatus === 'Connected' ? 'pulse 2s infinite' : 'none',
        }}
      />
    </Box>
  )
}
