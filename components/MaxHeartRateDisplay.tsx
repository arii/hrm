import { Typography, Box } from '@mui/material';

const MaxHeartRateDisplay = () => {
  return (
    <Box>
      <Typography variant="body1">Max Heart Rate: <Typography component="strong" variant="body1">-- bpm</Typography></Typography>
    </Box>
  );
};
export default MaxHeartRateDisplay;
