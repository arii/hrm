import React from 'react';
import {
  Modal,
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  Button,
  CircularProgress,
} from '@mui/material';
import { DiscoveredDevice } from '@/hooks/useMultiDeviceBluetooth';

interface DeviceSelectionModalProps {
  open: boolean;
  onClose: () => void;
  discoveredDevices: Record<string, DiscoveredDevice>;
  onSelectDevice: (device: BluetoothDevice, rssi?: number) => void;
}

const style = {
  position: 'absolute' as 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 400,
  bgcolor: 'background.paper',
  border: '2px solid #000',
  boxShadow: 24,
  p: 4,
};

const DeviceSelectionModal: React.FC<DeviceSelectionModalProps> = ({
  open,
  onClose,
  discoveredDevices,
  onSelectDevice,
}) => {
  return (
    <Modal
      open={open}
      onClose={onClose}
      aria-labelledby="device-selection-modal-title"
    >
      <Box sx={style}>
        <Typography id="device-selection-modal-title" variant="h6" component="h2">
          Select a Device
        </Typography>
        <List>
          {Object.values(discoveredDevices).map(({ device, rssi }) => (
            <ListItem
              key={device.id}
              button
              onClick={() => onSelectDevice(device, rssi)}
            >
              <ListItemText
                primary={device.name || 'Unknown Device'}
                secondary={`Signal Strength: ${rssi || 'N/A'} dBm`}
              />
            </ListItem>
          ))}
        </List>
        {Object.keys(discoveredDevices).length === 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
            <CircularProgress />
          </Box>
        )}
        <Button onClick={onClose} sx={{ mt: 2 }}>
          Cancel
        </Button>
      </Box>
    </Modal>
  );
};

export default DeviceSelectionModal;
