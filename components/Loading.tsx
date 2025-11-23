// components/Loading.tsx
import { Box, CircularProgress, Typography } from '@mui/material'

const Loading = ({ message = 'Loading...' }: { message?: string }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        py: 4,
        minHeight: '80vh',
      }}
    >
      <CircularProgress />
      <Typography sx={{ ml: 2 }}>{message}</Typography>
    </Box>
  )
}

export default Loading
