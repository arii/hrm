import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  CircularProgress,
  Stack,
} from '@mui/material';
import BatteryChargingFullIcon from '@mui/icons-material/BatteryChargingFull';
import BatteryFullIcon from '@mui/icons-material/BatteryFull';
import BatteryStdIcon from '@mui/icons-material/BatteryStd';
import BatteryAlertIcon from '@mui/icons-material/BatteryAlert';
import { ConnectedDevice } from '@/hooks/useMultiDeviceBluetooth';
import HrTile from '../../../components/HrTile';
import { getHrZoneProps } from '@/utils/visualization';

interface DeviceCardProps {
  device: ConnectedDevice;
  onDisconnect: (deviceId: string) => void;
  onForget: (deviceId: string) => void;
  userAge: number;
}

const getBatteryIcon = (level: number) => {
  if (level > 90) return <BatteryFullIcon color="success" />;
  if (level > 50) return <BatteryChargingFullIcon color="action" />;
  if (level > 20) return <BatteryStdIcon color="warning" />;
  return <BatteryAlertIcon color="error" />;
};

const DeviceCard: React.FC<DeviceCardProps> = ({ device, onDisconnect, onForget, userAge }) => {
  const isConnected = device.status.startsWith('Connected');
  const maxHr = userAge ? 220 - userAge : 190;
  const hrZoneProps = getHrZoneProps(device.hrValue || 0, maxHr);

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Typography variant="h6" component="div">
          {device.device.name || 'Unknown Device'}
        </Typography>
        <Typography sx={{ mb: 1.5 }} color="text.secondary">
          Status: {device.status} {device.disconnectionReason && `(${device.disconnectionReason})`}
        </Typography>

        {isConnected && device.hrValue && (
            <HrTile
                name={device.device.name || 'Unknown Device'}
                bpm={device.hrValue}
                percentMax={hrZoneProps.percentage}
                isAlerting={false}
            />
        )}

        {device.batteryLevel !== undefined && (
          <Stack direction="row" alignItems="center" spacing={1} sx={{mt: 1}}>
            {getBatteryIcon(device.batteryLevel)}
            <Typography variant="body2">{device.batteryLevel}% Battery</Typography>
          </Stack>
        )}
        <Box sx={{ mt: 2 }}>
          {isConnected ? (
            <Button
              variant="outlined"
              color="error"
              onClick={() => onDisconnect(device.id)}
            >
              Disconnect
            </Button>
          ) : (
            <CircularProgress size={24} />
          )}
          <Button
            variant="text"
            color="secondary"
            onClick={() => onForget(device.id)}
            sx={{ ml: 1 }}
          >
            Forget
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};

export default DeviceCard;
