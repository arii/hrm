'use client'
import { useWebSocket } from '@/context/WebSocketContext'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { useTheme } from '@mui/material/styles'

export const TimerConnectionStatus = () => {
  const { connectionStatus } = useWebSocket()
  const theme = useTheme()

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'Connected':
        return theme.palette.success.main
      case 'Reconnecting...':
        return theme.palette.warning.main
      default:
        return theme.palette.error.main
    }
  }

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 1,
        padding: 2,
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
          backgroundColor: getStatusColor(),
          animation:
            connectionStatus === 'Connected' ? 'pulse 2s infinite' : 'none',
        }}
      />
    </Box>
  )
}
