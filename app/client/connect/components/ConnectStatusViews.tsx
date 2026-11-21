import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import BatteryChargingFullIcon from '@mui/icons-material/BatteryChargingFull'
import BatteryFullIcon from '@mui/icons-material/BatteryFull'
import BatteryStdIcon from '@mui/icons-material/BatteryStd'
import BatteryAlertIcon from '@mui/icons-material/BatteryAlert'
import UserSettings from '../UserSettings'
import type { UserProfileState } from '@/types/connect'
import type { ConnectionBanner } from '../connectViewState'

const BatteryIcon = ({ level }: { level: number }) => {
  if (level > 90) return <BatteryFullIcon color="success" />
  if (level > 50) return <BatteryChargingFullIcon color="action" />
  if (level > 20) return <BatteryStdIcon color="warning" />
  return <BatteryAlertIcon color="error" />
}

export const BatteryRow = ({ batteryLevel }: { batteryLevel: number }) => (
  <Stack
    direction="row"
    spacing={0.5}
    sx={{
      alignItems: 'center',
      justifyContent: 'center',
      color: 'text.secondary',
      mb: 1,
    }}
  >
    <BatteryIcon level={batteryLevel} />
    <Typography variant="body2">{batteryLevel}% Battery</Typography>
  </Stack>
)

export const MetadataStrip = ({
  userName,
  userAge,
  isConnected,
  deviceStatus,
}: {
  userName: string
  userAge: string
  isConnected: boolean
  deviceStatus: string
}) => (
  <Box sx={{ mb: 2, textAlign: 'center' }}>
    <Typography variant="body2" color="text.secondary">
      Connected as {userName} · Age {userAge}
      {isConnected && <> · {deviceStatus}</>}
    </Typography>
  </Box>
)

export const ProfileSection = ({
  showUserProfile,
  userProfile,
}: {
  showUserProfile: boolean
  userProfile: UserProfileState
}) => (showUserProfile ? <UserSettings profile={userProfile} /> : null)

export const StatusBanner = ({
  banner,
}: {
  banner: ConnectionBanner | null
}) =>
  banner ? (
    <Alert
      data-testid="connection-status-alert"
      severity={banner.severity}
      sx={{ mb: 2 }}
    >
      {banner.text}
    </Alert>
  ) : null
