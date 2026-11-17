'use client'
import Box from '@mui/material/Box'
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
      aria-label={`Start ${workDuration}/${restDuration}`}
      sx={{
        // The header keeps its full width; on cramped cards the label
        // truncates instead of covering the title.
        flexShrink: 1,
        minWidth: 0,
        overflow: 'hidden',
        fontWeight: 700,
        whiteSpace: 'nowrap',
        mr: clearCorner ? 5 : 0,
      }}
    >
      <Box
        component="span"
        sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}
      >
        Start {workDuration}/{restDuration}
      </Box>
    </Button>
  )
}

export default IntervalStartButton
