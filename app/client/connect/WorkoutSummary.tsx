import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import WatchLaterIcon from '@mui/icons-material/WatchLater'
import WhatshotIcon from '@mui/icons-material/Whatshot'
import Button from '@mui/material/Button'
import DownloadIcon from '@mui/icons-material/Download'
import CircularProgress from '@mui/material/CircularProgress'

interface WorkoutSummaryProps {
  duration: string
  caloriesBurned: number
  sessionId?: string
  onExportFit?: () => void
  isExporting?: boolean
  showExport?: boolean
}

const WorkoutSummary = ({
  duration,
  caloriesBurned,
  onExportFit,
  isExporting,
  showExport,
}: WorkoutSummaryProps) => {
  return (
    <Paper
      data-testid="workout-summary"
      elevation={3}
      sx={{
        p: 2,
        mt: 2,
        bgcolor: 'background.paper',
        borderRadius: 1.5,
      }}
    >
      <Stack spacing={2}>
        <Typography variant="h6" component="h3" align="center" gutterBottom>
          Workout Summary
        </Typography>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-around',
            alignItems: 'center',
            textAlign: 'center',
          }}
        >
          <Stack spacing={1} alignItems="center">
            <WatchLaterIcon color="action" sx={{ fontSize: 30 }} />
            <Typography variant="h5" component="p" fontWeight="bold">
              {duration}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Duration
            </Typography>
          </Stack>
          <Stack spacing={1} alignItems="center">
            <WhatshotIcon color="error" sx={{ fontSize: 30 }} />
            <Typography variant="h5" component="p" fontWeight="bold">
              {(Number(caloriesBurned) || 0).toFixed(1)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Calories Burned
            </Typography>
          </Stack>
        </Box>
        {showExport && onExportFit && (
          <Box sx={{ mt: 1, textAlign: 'center' }}>
            <Button
              variant="contained"
              color="primary"
              onClick={onExportFit}
              disabled={isExporting}
              startIcon={
                isExporting ? (
                  <CircularProgress size={24} color="inherit" />
                ) : (
                  <DownloadIcon />
                )
              }
              fullWidth
              aria-label="Download workout as FIT file"
              sx={{ borderRadius: 1 }}
            >
              {isExporting ? 'Generating...' : 'Download FIT File'}
            </Button>
          </Box>
        )}
      </Stack>
    </Paper>
  )
}

export default WorkoutSummary
