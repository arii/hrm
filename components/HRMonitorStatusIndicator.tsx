// File: components/HRMonitorStatusIndicator.tsx
import React from 'react'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import CircularProgress from '@mui/material/CircularProgress'
import BatteryFullIcon from '@mui/icons-material/BatteryFull'
import BatteryChargingFullIcon from '@mui/icons-material/BatteryChargingFull'
import BatteryAlertIcon from '@mui/icons-material/BatteryAlert'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ErrorIcon from '@mui/icons-material/Error'
import LinkOffIcon from '@mui/icons-material/LinkOff'
import Tooltip from '@mui/material/Tooltip'
import { HRMState } from '@/hooks/useBluetoothHRM'

interface HRMonitorStatusIndicatorProps {
  state: HRMState
  batteryLevel: number | null
}

const getStatusDisplay = (
  state: HRMState
): {
  icon: React.ReactElement
  color:
    | 'default'
    | 'primary'
    | 'secondary'
    | 'error'
    | 'info'
    | 'success'
    | 'warning'
  label: string
} => {
  switch (state.status) {
    case 'CONNECTED':
      return {
        icon: <CheckCircleIcon />,
        color: 'success',
        label: `Connected: ${state.deviceName}`,
      }
    case 'CONNECTING':
      return {
        icon: <CircularProgress size={20} />,
        color: 'info',
        label: state.errorMessage || `Connecting: ${state.deviceName}...`,
      }
    case 'SEARCHING':
      return {
        icon: <CircularProgress size={20} />,
        color: 'info',
        label: 'Searching for device...',
      }
    case 'DISCONNECTED':
      return {
        icon: <LinkOffIcon />,
        color: 'warning',
        label: 'Disconnected',
      }
    case 'ERROR':
      return {
        icon: <ErrorIcon />,
        color: 'error',
        label: `Error: ${state.errorMessage}`,
      }
    default:
      return {
        icon: <LinkOffIcon />,
        color: 'default',
        label: 'Unknown Status',
      }
  }
}

const BatteryIndicator: React.FC<{ level: number | null }> = ({ level }) => {
  if (level === null) return null

  let icon = <BatteryFullIcon />
  if (level > 95) {
    icon = <BatteryChargingFullIcon />
  } else if (level <= 20) {
    icon = <BatteryAlertIcon color="error" />
  }

  return (
    <Tooltip title={`Battery: ${level}%`}>
      <div style={{ display: 'flex', alignItems: 'center' }}>{icon}</div>
    </Tooltip>
  )
}

const HRMonitorStatusIndicator: React.FC<HRMonitorStatusIndicatorProps> = ({
  state,
  batteryLevel,
}) => {
  const { icon, color, label } = getStatusDisplay(state)

  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <Chip
        icon={icon}
        label={label}
        color={color}
        variant="outlined"
        sx={(theme) => ({
          padding: theme.spacing(1, 1.5),
          height: 'auto',
          '& .MuiChip-label': {
            whiteSpace: 'normal',
            lineHeight: 1.25,
          },
        })}
      />
      <BatteryIndicator level={batteryLevel} />
    </Stack>
  )
}

export default HRMonitorStatusIndicator
