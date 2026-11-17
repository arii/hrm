'use client'
import Button from '@mui/material/Button'
import PlayArrow from '@mui/icons-material/PlayArrow'
import { useDashboardTimerControl } from '@/components/DashboardTimerControl'
import { parseIntervalHeader } from '@/lib/intervalHeader'

/** "Start 20/10" on cards whose header names a work/rest interval. */
const IntervalStartButton = ({ header }: { header: string }) => {
  const control = useDashboardTimerControl()
  const interval = parseIntervalHeader(header)
  if (!control || !interval) return null
  const { workDuration, restDuration } = interval

  return (
    <Button
      data-testid="interval-start"
      variant="outlined"
      size="small"
      startIcon={<PlayArrow />}
      disabled={!control.canControl || control.isRunning}
      onClick={() => control.startInterval(workDuration, restDuration)}
      sx={{ alignSelf: 'center', mt: 1, fontWeight: 700 }}
    >
      Start {workDuration}/{restDuration}
    </Button>
  )
}

export default IntervalStartButton
