// components/Spotify/ProgressBar.tsx
import React from 'react';
import Slider from '@mui/material/Slider';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

interface ProgressBarProps {
  progressMs: number;
  durationMs: number;
  onSeek: (positionMs: number) => void;
}

const formatTime = (ms: number) => {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const ProgressBar: React.FC<ProgressBarProps> = ({
  progressMs,
  durationMs,
  onSeek,
}) => {
  const [seeking, setSeeking] = React.useState(false);
  const [seekValue, setSeekValue] = React.useState(0);

  const handleChange = (event: Event, newValue: number | number[]) => {
    setSeekValue(newValue as number);
  };

  const handleChangeCommitted = (
    event: React.SyntheticEvent | Event,
    newValue: number | number[]
  ) => {
    onSeek(newValue as number);
    setSeeking(false);
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {formatTime(seeking ? seekValue : progressMs)}
      </Typography>
      <Slider
        aria-label="Track progress"
        value={seeking ? seekValue : progressMs}
        min={0}
        max={durationMs}
        onChange={handleChange}
        onChangeCommitted={handleChangeCommitted}
        onMouseDown={() => setSeeking(true)}
        sx={{
          color: 'primary.main',
          '& .MuiSlider-thumb': {
            width: 12,
            height: 12,
            transition: '0.3s cubic-bezier(.47,1.64,.41,.8)',
            '&:before': {
              boxShadow: '0 2px 12px 0 rgba(0,0,0,0.4)',
            },
            '&:hover, &.Mui-focusVisible': {
              boxShadow: `0px 0px 0px 8px ${'rgb(255 255 255 / 16%)'}`,
            },
            '&.Mui-active': {
              width: 20,
              height: 20,
            },
          },
          '& .MuiSlider-rail': {
            opacity: 0.28,
          },
        }}
      />
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {formatTime(durationMs)}
      </Typography>
    </Box>
  );
};

export default ProgressBar;
