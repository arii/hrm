// File: components/HRMonitorStatusIndicator.tsx
'use client'
import { memo } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Alert from '@mui/material/Alert'
import BatteryFullIcon from '@mui/icons-material/BatteryFull'
import BatteryChargingFullIcon from '@mui/icons-material/BatteryChargingFull'
import Battery50Icon from '@mui/icons-material/Battery50'
import Battery20Icon from '@mui/icons-material/Battery20'
import BatteryAlertIcon from '@mui/icons-material/BatteryAlert'
import Tooltip from '@mui/material/Tooltip'

interface HRMonitorStatusIndicatorProps {
  deviceStatus: string
  batteryLevel: number | null
}

const HRMonitorStatusIndicator = ({
  deviceStatus,
  batteryLevel,
}: HRMonitorStatusIndicatorProps) => {
  const getBatteryIcon = (level: number) => {
    if (level > 95) return <BatteryFullIcon fontSize="small" />
    if (level > 60)
      return <BatteryChargingFullIcon fontSize="small" color="success" />
    if (level > 30) return <Battery50Icon fontSize="small" color="warning" />
    if (level > 10) return <Battery20Icon fontSize="small" color="error" />
    return <BatteryAlertIcon fontSize="small" color="error" />
  }

  if (deviceStatus.toLowerCase().includes('failed')) {
    return (
      <Alert severity="error" sx={{ width: '100%' }}>
        Connection failed. Please try again.
      </Alert>
    )
  }

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        p: 1.5,
        borderRadius: 2,
        bgcolor: 'action.hover',
      }}
      role="status"
      aria-live="polite"
    >
      <Typography variant="body2" sx={{ flexGrow: 1, fontWeight: 'medium' }}>
        Status:
      </Typography>
      <Chip label={deviceStatus} color="primary" variant="outlined" />

      {batteryLevel !== null && (
        <Tooltip title={`Battery: ${batteryLevel}%`}>
          <Chip
            icon={getBatteryIcon(batteryLevel)}
            label={`${batteryLevel}%`}
            variant="outlined"
            size="small"
          />
        </Tooltip>
      )}
    </Box>
  )
}

export default memo(HRMonitorStatusIndicator)
