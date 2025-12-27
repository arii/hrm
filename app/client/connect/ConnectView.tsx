// app/client/connect/ConnectView.tsx
'use client'

import React from 'react'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import BluetoothDisabledIcon from '@mui/icons-material/BluetoothDisabled'
import UserSettings from './UserSettings'
import ConnectionManager from './ConnectionManager'
import WorkoutManager from './WorkoutManager'
import BottomNavBar from '../../../components/BottomNavBar'
import { useWorkoutSession } from '@/hooks/useWorkoutSession'
import { useCalorieCounter } from '@/hooks/useCalorieCounter'
import { formatDuration } from '@/lib/utils'

interface ConnectViewProps {
  userName: string;
  userAge: string;
  weightInKg: string;
  isConnected: boolean;
  isSupported: boolean;
  deviceStatus: string;
  batteryLevel: number | null;
  currentHR: number;
  hrZoneProps: { percentage: number; progressColor: string };
  connectionStatus: string;
  onConnect: () => void;
  onDisconnect: () => void;
  onForgetDevice: () => Promise<void>;
  disconnectionReason: string | null;
}

const ConnectView: React.FC<ConnectViewProps> = ({
  userName,
  userAge,
  weightInKg,
  isConnected,
  isSupported,
  deviceStatus,
  batteryLevel,
  currentHR,
  hrZoneProps,
  connectionStatus,
  onConnect,
  onDisconnect,
  onForgetDevice,
  disconnectionReason,
}) => {
  const [isResetting, setIsResetting] = React.useState(false);

  const {
    workoutDuration,
    resetWorkout: resetWorkoutSession,
    hasStarted,
    startWorkout,
    endWorkout,
    workoutStatus,
  } = useWorkoutSession({
    isConnected,
    totalCalories: 0, // This will be updated via a different mechanism
  });

  const { calories, resetCalories } = useCalorieCounter(
    currentHR,
    parseFloat(userAge) || 30,
    parseFloat(weightInKg) || 70,
    workoutStatus === 'running'
  );

  const resetWorkout = () => {
    resetWorkoutSession();
    resetCalories();
  };

  const handleFullReset = async () => {
    setIsResetting(true)
    try {
      await onForgetDevice()
      resetWorkout()
    } catch (error) {
      console.error('Reset failed:', error)
    } finally {
      setIsResetting(false)
    }
  }

  let deviceStatusMessage = deviceStatus;
  if (disconnectionReason === 'timeout') {
    deviceStatusMessage = 'Connection unstable. Trying to reconnect...';
  } else if (disconnectionReason === 'signal_loss') {
    deviceStatusMessage = 'Signal lost. Trying to reconnect...';
  }

  if (!isSupported) {
    return (
      <Container maxWidth="sm" sx={{ py: 10, textAlign: 'center' }}>
        <BluetoothDisabledIcon
          sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }}
        />
        <Typography variant="h5" gutterBottom>
          Bluetooth Not Supported
        </Typography>
        <Alert severity="warning" sx={{ mt: 2 }}>
          Your browser does not support Web Bluetooth. Please use Google Chrome,
          Edge, or Bluefy (on iOS).
        </Alert>
        <BottomNavBar />
      </Container>
    );
  }

  const showUserDetails = hasStarted || isConnected;
  const isConnectable = !!userName.trim() && !!userAge.trim();

  return (
    <>
      <Container maxWidth="sm" sx={{ py: 3, pb: 10 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Connect Heart Rate Monitor
        </Typography>

        {!showUserDetails ? (
          <UserSettings />
        ) : (
          <Box
            sx={{
              mb: 3,
              textAlign: 'center',
              p: 2,
              bgcolor: 'background.paper',
              borderRadius: 1,
              boxShadow: 1,
            }}
          >
            <Typography variant="subtitle1" color="text.secondary">
              Connected as
            </Typography>
            <Typography variant="h5" fontWeight="bold">
              {userName}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Age: {userAge}
            </Typography>
          </Box>
        )}

        <ConnectionManager
          onConnect={onConnect}
          onDisconnect={onDisconnect}
          isConnected={isConnected}
          deviceStatus={deviceStatusMessage}
          batteryLevel={batteryLevel}
          isConnectable={isConnectable}
        />

        {isConnected && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Connected! Heart rate data is being streamed.
          </Alert>
        )}

        {hasStarted && !isConnected && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Device Disconnected - Workout Paused
          </Alert>
        )}

        <WorkoutManager
          workoutStatus={workoutStatus}
          onStartWorkout={startWorkout}
          onEndWorkout={endWorkout}
          isConnected={isConnected}
          hasStarted={hasStarted}
          duration={formatDuration(workoutDuration)}
          caloriesBurned={calories}
          userName={userName}
          currentHR={currentHR}
          hrZoneProps={hrZoneProps}
        />

        <Typography
          variant="body2"
          color="text.secondary"
          align="center"
          sx={{ mt: 2 }}
        >
          WebSocket: {connectionStatus}
        </Typography>

        <Box
          sx={{
            textAlign: 'center',
            mt: 4,
            pt: 4,
            borderTop: '1px solid #eee',
          }}
        >
          <Button
            variant="contained"
            color="error"
            onClick={handleFullReset}
            disabled={isResetting || !hasStarted}
          >
            {isResetting ? 'Resetting...' : 'Reset System & Device'}
          </Button>
          <Typography
            variant="caption"
            display="block"
            sx={{ mt: 1, color: 'text.secondary' }}
          >
            Resets server state AND forgets Bluetooth device connection.
          </Typography>
        </Box>
      </Container>
      <BottomNavBar />
    </>
  );
};

export default ConnectView;
