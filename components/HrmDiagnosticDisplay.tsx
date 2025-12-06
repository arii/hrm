'use client'
import { Alert, AlertTitle, Box, Typography } from '@mui/material'
import { useWebSocket } from '@/context/WebSocketContext'
import { AlertSeverity, DiagnosticAlert } from '@/types/websocket'

const HrmDiagnosticDisplay = () => {
  const { activeAlerts } = useWebSocket()

  if (activeAlerts.length === 0) {
    return null
  }

  // Prioritize ERRORs over WARNINGs, and WARNINGs over INFOs
  const topAlert: DiagnosticAlert | undefined = activeAlerts.sort((a, b) => {
    const severityOrder: Record<AlertSeverity, number> = {
      ERROR: 3,
      WARNING: 2,
      INFO: 1,
    }
    return severityOrder[b.severity] - severityOrder[a.severity]
  })[0]

  if (!topAlert) {
    return null
  }

  const alertType = topAlert.severity.toLowerCase() as
    | 'error'
    | 'warning'
    | 'info'

  return (
    <Box sx={{ my: 2, width: '100%' }}>
      <Alert severity={alertType} variant="filled">
        <AlertTitle>{topAlert.code.replace(/_/g, ' ')}</AlertTitle>
        <Typography variant="body1">{topAlert.message}</Typography>
        {topAlert.code === 'BAD_PLACEMENT' && (
          <Typography variant="caption" display="block" sx={{ mt: 1 }}>
            <strong>Action:</strong> Adjust the sensor on your chest or wrist
            and ensure continuous contact.
          </Typography>
        )}
      </Alert>
    </Box>
  )
}

export default HrmDiagnosticDisplay
