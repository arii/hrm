// app/client/experimental/components/SessionDetail.tsx
'use client'
import { Card, CardContent, Typography, Button, Box } from '@mui/material'
import { WorkoutSessionData } from '@/lib/workout-session-storage'
import logger from '@/utils/logger'
import { formatDate } from '@/lib/utils'
import { generateFitFile } from '@/utils/fit-export'
import { generateCsvExport } from '@/utils/csv-export'
import { useAppSnackbar } from '@/hooks/useAppSnackbar'
import { HeartRateTimeSeries, ZoneDistribution } from './dynamicCharts'

interface SessionDetailProps {
  session: WorkoutSessionData
  onBack: () => void
}

const SessionDetail = ({ session, onBack }: SessionDetailProps) => {
  const { showError, showSuccess } = useAppSnackbar()

  const totalCalories =
    session.calorieHistory.length > 0
      ? (session.calorieHistory[session.calorieHistory.length - 1]
          ?.totalToThisPoint ?? 0)
      : 0
  const durationInSeconds = session.endTime
    ? (session.endTime - session.startTime) / 1000
    : 0
  const avgHr =
    session.hrHistory.reduce((sum, dp) => sum + dp.hr, 0) /
      session.hrHistory.length || 0

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleExportFit = () => {
    try {
      const blob = generateFitFile(session)
      downloadBlob(blob, `hrm_session_${session.sessionId}.fit`)
      showSuccess('FIT file exported successfully')
    } catch (error) {
      logger.error('Failed to export FIT file:', error)
      showError('Failed to export FIT file')
    }
  }

  const handleExportCsv = () => {
    try {
      const blob = generateCsvExport(session)
      downloadBlob(blob, `hrm_session_${session.sessionId}.csv`)
      showSuccess('CSV file exported successfully')
    } catch (error) {
      logger.error('Failed to export CSV file:', error)
      showError('Failed to export CSV file')
    }
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h5" gutterBottom>
          Workout Details
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <Button onClick={onBack}>&larr; Back to List</Button>
          <Button onClick={handleExportFit} variant="outlined">
            Export FIT
          </Button>
          <Button onClick={handleExportCsv} variant="outlined">
            Export CSV
          </Button>
        </Box>

        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            gap: 3,
          }}
        >
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6">Summary</Typography>
            <Typography>Date: {formatDate(session.startTime)}</Typography>
            <Typography>
              Duration: {(durationInSeconds / 60).toFixed(1)} mins
            </Typography>
            <Typography>
              Total Calories: {totalCalories.toFixed(0)} kCal
            </Typography>
            <Typography>Average HR: {avgHr.toFixed(0)} bpm</Typography>
          </Box>

          <Box sx={{ flex: 1 }}>
            <ZoneDistribution timeInZones={session.timeInZones} />
          </Box>
        </Box>
        {session.hrHistory.length > 0 && (
          <HeartRateTimeSeries hrHistory={session.hrHistory} />
        )}
      </CardContent>
    </Card>
  )
}

export default SessionDetail
