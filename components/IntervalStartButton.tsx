'use client'
import Button from '@mui/material/Button'
import PlayArrow from '@mui/icons-material/PlayArrow'
import { useDashboardTimerControl } from '@/components/DashboardTimerControl'
import { parseIntervalHeader } from '@/lib/intervalHeader'

/** "Start 20/10" on cards whose header names a work/rest interval. */
const IntervalStartButton = ({
  header,
  clearCorner = false,
}: {
  header: string
  /** Leave room for the refresh button docked in the grid's top-right. */
  clearCorner?: boolean
}) => {
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
      sx={{
        flexShrink: 0,
        fontWeight: 700,
        whiteSpace: 'nowrap',
        mr: clearCorner ? 5 : 0,
      }}
    >
      Start {workDuration}/{restDuration}
    </Button>
  )
}

export default IntervalStartButton
