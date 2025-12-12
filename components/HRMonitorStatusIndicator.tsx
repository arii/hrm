// File: components/HRMonitorStatusIndicator.tsx
import React from 'react'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import BatteryFullIcon from '@mui/icons-material/BatteryFull'
import BatteryChargingFullIcon from '@mui/icons-material/BatteryChargingFull'
import BatteryAlertIcon from '@mui/icons-material/BatteryAlert'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ErrorIcon from '@mui/icons-material/Error'
import LinkOffIcon from '@mui/icons-material/LinkOff'
import Tooltip from '@mui/material/Tooltip'

interface HRMonitorStatusIndicatorProps {
  status: string
  batteryLevel: number | null
}

const HRMonitorStatusIndicator: React.FC<HRMonitorStatusIndicatorProps> = ({
  status,
  batteryLevel,
}) => {
  const isConnected = status.startsWith('Connected')
  const isConnecting = status.toLowerCase().includes('connecting') || status.toLowerCase().includes('searching')
  const isDisconnected = !isConnected && !isConnecting
  const isError = status.toLowerCase().includes('failed') || status.toLowerCase().includes('error')

  let statusIcon
  let statusColor: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' = 'default'

  if (isConnected) {
    statusIcon = <CheckCircleIcon />
    statusColor = 'success'
  } else if (isConnecting) {
    statusIcon = <CircularProgress size={20} />
    statusColor = 'info'
  } else if (isError) {
    statusIcon = <ErrorIcon />
    statusColor = 'error'
  } else if (isDisconnected) {
    statusIcon = <LinkOffIcon />
    statusColor = 'warning'
  }

  const getBatteryIcon = () => {
    if (batteryLevel === null) return null
    let icon = <BatteryFullIcon />
    let title = `Battery: ${batteryLevel}%`

    if (batteryLevel > 95) {
        icon = <BatteryChargingFullIcon />
    } else if (batteryLevel <= 20) {
        icon = <BatteryAlertIcon color="error" />
    }

    return (
      <Tooltip title={title}>
        <div style={{ display: 'flex', alignItems: 'center', marginLeft: 8 }}>
          {icon}
        </div>
      </Tooltip>
    )
  }

  return (
    <Chip
      icon={statusIcon}
      label={status}
      color={statusColor}
      variant="outlined"
      deleteIcon={getBatteryIcon()}
      onDelete={() => {}} // onDelete is required for deleteIcon to be rendered
      sx={{
        fontSize: '1rem',
        padding: '10px 15px',
        height: 'auto',
        '& .MuiChip-label': {
          whiteSpace: 'normal',
          lineHeight: '1.2',
        },
      }}
    />
  )
}

export default HRMonitorStatusIndicator
