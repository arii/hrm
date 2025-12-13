import { Typography, Box } from '@mui/material';

const AverageHeartRateDisplay = () => {
  return (
    <Box>
      <Typography variant="body1">Avg Heart Rate: <Typography component="strong" variant="body1">-- bpm</Typography></Typography>
    </Box>
  );
};
export default AverageHeartRateDisplay;
