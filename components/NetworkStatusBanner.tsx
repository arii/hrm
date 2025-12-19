'use client'

import { useConnectivity } from '@/context/ConnectivityContext'
import { useWebSocket } from '@/context/WebSocketContext'
import { Alert, Box, Snackbar } from '@mui/material'

const NetworkStatusBanner = () => {
  const { networkStatus } = useConnectivity()
  const { connectionStatus } = useWebSocket()

  const isOffline = networkStatus === 'offline'
  const isLimited = networkStatus === 'limited'

  // Determine the message and severity based on network and WebSocket status
  let message = ''
  let severity: 'error' | 'warning' | 'info' = 'info'
  let open = true

  if (isOffline) {
    message = 'You are currently offline. Some features may be unavailable.'
    severity = 'error'
  } else if (isLimited) {
    message =
      'Limited connectivity. We are having trouble connecting to the server.'
    severity = 'warning'
  } else if (connectionStatus === 'Reconnecting...') {
    message = 'Connection lost. Attempting to reconnect...'
    severity = 'warning'
  } else if (connectionStatus === 'Failed to connect') {
    message = 'Failed to connect. Please check your connection and refresh the page.'
    severity = 'error'
  } else {
    open = false // Hide the banner if everything is fine
  }


  return (
    <Snackbar
      open={open}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      sx={{ width: '100%' }}
    >
      <Alert
        severity={severity}
        sx={{
          width: '100%',
          boxShadow: 6,
          display: 'flex',
          alignItems: 'center',
          zIndex: (theme) => theme.zIndex.snackbar,
        }}
      >
        <Box sx={{ flexGrow: 1 }}>{message}</Box>
      </Alert>
    </Snackbar>
  )
}

export default NetworkStatusBanner
