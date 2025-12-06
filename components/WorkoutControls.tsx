// components/WorkoutControls.tsx
import React from 'react'
import { Button, Box, Skeleton } from '@mui/material'
import { useWebSocket } from '@/context/WebSocketContext'
import dynamic from 'next/dynamic'
import useVolumePreference from '@/hooks/useVolumePreference'

const TimerDisplay = dynamic(() => import('./TimerDisplay'), {
  ssr: false,
  loading: () => <Skeleton variant="rectangular" height={300} />,
})

const WorkoutControls: React.FC = () => {
  const { send, timerData } = useWebSocket()
  const { volume } = useVolumePreference()

  const handleStart = () => {
    send({ type: 'TIMER_COMMAND', payload: { command: 'START' } })
  }

  const handleStop = () => {
    send({ type: 'TIMER_COMMAND', payload: { command: 'STOP' } })
  }

  return (
    <Box>
      <TimerDisplay
        phase={timerData.currentPhase}
        timeRemaining={timerData.timeRemaining}
        timeElapsed={timerData.timeElapsed}
        mode={timerData.mode}
        workDuration={timerData.workDuration}
        restDuration={timerData.restDuration}
        soundEventId={timerData.soundEventId}
        volume={volume}
      />
      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, my: 2 }}>
        <Button
          variant="contained"
          color="primary"
          onClick={handleStart}
          size="large"
        >
          Start Workout
        </Button>
        <Button
          variant="contained"
          color="secondary"
          onClick={handleStop}
          size="large"
        >
          Stop Workout
        </Button>
      </Box>
    </Box>
  )
}

export default WorkoutControls
