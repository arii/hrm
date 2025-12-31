import CircularProgress from '@mui/material/CircularProgress'
import Box from '@mui/material/Box'

const CircularLoadingIndicator = ({ height = '100px' }) => {
  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      height={height}
    >
      <CircularProgress />
    </Box>
  )
}

export default CircularLoadingIndicator
