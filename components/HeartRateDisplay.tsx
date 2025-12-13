import { Typography, Box } from '@mui/material'

const HeartRateDisplay = () => {
  return (
    <Box>
      <Typography variant="body1">
        Heart Rate:{' '}
        <Typography component="strong" variant="body1">
          -- bpm
        </Typography>
      </Typography>
    </Box>
  )
}
export default HeartRateDisplay
