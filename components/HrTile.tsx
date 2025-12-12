// File: components/HrTile.tsx
'use client'
import { memo } from 'react';
import { Box, CardContent, CircularProgress, Tooltip, Typography } from '@mui/material';
import { useHeartRateMetrics } from '@/hooks/useHeartRateMetrics';
import { useWebSocket } from '@/context/WebSocketContext';
import StyledCard from './shared/StyledCard';
import HeartRateDisplay from './HeartRate/HeartRateDisplay';
import AverageHeartRateDisplay from './HeartRate/AverageHeartRateDisplay';
import MaxHeartRateDisplay from './HeartRate/MaxHeartRateDisplay';
import HeartRateZoneIndicator from './HeartRate/HeartRateZoneIndicator';
import { getHrZoneProps } from '@/utils/visualization';
import { MAX_HR_DEFAULT } from '@/utils/constants';

// Define the style for the centered overlay
const overlayStyles = {
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  backgroundColor: 'rgba(0, 0, 0, 0.7)',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 10,
  borderRadius: 'inherit',
};

interface HrTileProps {
  clientId: string;
  name: string;
  maxHr?: number;
  isAlerting: boolean;
  alertMessage?: string;
}

const HrTile = ({
  clientId,
  name,
  maxHr,
  isAlerting,
  alertMessage = 'Checking signal...',
}: HrTileProps) => {
  const { hrmData } = useWebSocket();
  const { currentHeartRate, averageHeartRate, maxHeartRate } = useHeartRateMetrics(clientId, hrmData);

  const percentMax = currentHeartRate
    ? Math.round((currentHeartRate / (maxHr || MAX_HR_DEFAULT)) * 100)
    : 0;

  const { backgroundColor } = getHrZoneProps(currentHeartRate || 0, maxHr || MAX_HR_DEFAULT);

  return (
    <Tooltip
      title={
        isAlerting
          ? alertMessage
          : `Name: ${name}, BPM: ${currentHeartRate}, % Max HR: ${percentMax}%`
      }
      arrow
    >
      <StyledCard
        data-testid="hr-tile-card"
        role="region"
        aria-label={`Heart rate monitor for ${name}: ${currentHeartRate} beats per minute, ${percentMax}% of maximum`}
        sx={{
          backgroundColor: backgroundColor,
          color: '#fff',
          textAlign: 'center',
          minHeight: 180,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        {isAlerting && (
          <Box sx={overlayStyles} data-testid="hr-tile-alert-overlay">
            <CircularProgress size={30} sx={{ color: 'white' }} />
            <Typography
              variant="caption"
              sx={{ mt: 1, color: 'white', textAlign: 'center' }}
            >
              {alertMessage}
            </Typography>
          </Box>
        )}
        <Box aria-live="polite" aria-atomic="true">
          <CardContent sx={{ p: 0 }}>
            <HeartRateDisplay bpm={currentHeartRate} />
            <Box sx={{ display: 'flex', justifyContent: 'space-around', mt: 1 }}>
              <AverageHeartRateDisplay avgBpm={averageHeartRate} />
              <MaxHeartRateDisplay maxBpm={maxHeartRate} />
            </Box>
            <Box sx={{ mt: 1 }}>
              <HeartRateZoneIndicator bpm={currentHeartRate} maxHr={maxHr || MAX_HR_DEFAULT} />
            </Box>
            {name && !/^(user|new user)$/i.test(name) && (
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 700,
                  fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
                  letterSpacing: '0.05em',
                  mt: 1,
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                }}
              >
                {name}
              </Typography>
            )}
          </CardContent>
        </Box>
      </StyledCard>
    </Tooltip>
  );
};

const arePropsEqual = (prevProps: HrTileProps, nextProps: HrTileProps) => {
  return (
    prevProps.clientId === nextProps.clientId &&
    prevProps.name === nextProps.name &&
    prevProps.maxHr === nextProps.maxHr &&
    prevProps.isAlerting === nextProps.isAlerting &&
    prevProps.alertMessage === nextProps.alertMessage
  );
};

export default memo(HrTile, arePropsEqual);
