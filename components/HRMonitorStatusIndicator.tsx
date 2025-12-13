// File: components/HRMonitorStatusIndicator.tsx
'use client'
import { memo } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import BatteryFullIcon from '@mui/icons-material/BatteryFull'
import Battery50Icon from '@mui/icons-material/Battery50'
import Battery20Icon from '@mui/icons-material/Battery20'
import BatteryAlertIcon from '@mui/icons-material/BatteryAlert'
import Tooltip from '@mui/material/Tooltip'
import CircularProgress from '@mui/material/CircularProgress'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ErrorIcon from '@mui/icons-material/Error'
import LinkOffIcon from '@mui/icons-material/LinkOff'

interface HRMonitorStatusIndicatorProps {
  deviceStatus: string
  batteryLevel: number | null
}

const HRMonitorStatusIndicator = ({
  deviceStatus,
  batteryLevel,
}: HRMonitorStatusIndicatorProps) => {
  const getBatteryIcon = (level: number | null) => {
    if (level === null) return null
    if (level > 70) return <BatteryFullIcon fontSize="small" />
    if (level > 40) return <Battery50Icon fontSize="small" />
    if (level > 20) return <Battery20Icon fontSize="small" />
    return <BatteryAlertIcon fontSize="small" />
  }

  const getStatusIcon = (status: string) => {
    const lowerCaseStatus = status.toLowerCase()
    if (
      lowerCaseStatus.includes('searching') ||
      lowerCaseStatus.includes('connecting')
    ) {
      return <CircularProgress size={20} />
    }
    if (lowerCaseStatus.includes('connected')) {
      return <CheckCircleIcon color="success" />
    }
    if (
      lowerCaseStatus.includes('failed') ||
      lowerCaseStatus.includes('error')
    ) {
      return <ErrorIcon color="error" />
    }
    return <LinkOffIcon color="disabled" />
  }

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        p: 1,
        borderRadius: 1,
        bgcolor: 'action.hover',
      }}
    >
      {getStatusIcon(deviceStatus)}
      <Typography variant="body2" sx={{ flexGrow: 1 }}>
        {deviceStatus}
      </Typography>
      {batteryLevel !== null && (
        <Tooltip title={`Battery: ${batteryLevel}%`}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {getBatteryIcon(batteryLevel)}
            <Typography variant="caption">{batteryLevel}%</Typography>
          </Box>
        </Tooltip>
      )}
    </Box>
  )
}

export default memo(HRMonitorStatusIndicator)
