'use client'

import { useEffect, useReducer, useState } from 'react'
import { useWebSocket } from '@/context/WebSocketContext'
import { useUserSettings } from '@/context/UserSettingsContext'
import { Button, Typography, Paper, Box, Container } from '@mui/material'
import { generateFitFile } from '@/lib/fit-generator'

interface State {
  workoutBuffer: Array<{ time: number; hr: number }>
  sessionStartTime: number | null
  workoutDuration: number
  caloriesBurned: number
}

type Action =
  | { type: 'START_SESSION' }
  | { type: 'ADD_HR_DATA'; payload: number }
  | { type: 'END_SESSION'; payload: { duration: number; calories: number } }

const initialState: State = {
  workoutBuffer: [],
  sessionStartTime: null,
  workoutDuration: 0,
  caloriesBurned: 0,
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'START_SESSION':
      return { ...state, sessionStartTime: Date.now(), workoutBuffer: [] }
    case 'ADD_HR_DATA':
      return {
        ...state,
        workoutBuffer: [
          ...state.workoutBuffer,
          { time: Date.now(), hr: action.payload },
        ],
      }
    case 'END_SESSION':
      return {
        ...state,
        workoutDuration: action.payload.duration,
        caloriesBurned: action.payload.calories,
        sessionStartTime: null, // Reset to prevent infinite loop
      }
    default:
      return state
  }
}

const ExperimentalWorkoutPage = () => {
  const webSocketContext = useWebSocket()
  const [userSettings] = useUserSettings()
  const [state, dispatch] = useReducer(reducer, initialState)
  const [fitGenerator, setFitGenerator] = useState<
    typeof generateFitFile | null
  >(null)
  const timerData = webSocketContext?.timerData
  const hrmData = webSocketContext?.hrmData

  useEffect(() => {
    if (!timerData) {
      return
    }

    if (timerData.isRunning && state.sessionStartTime === null) {
      dispatch({ type: 'START_SESSION' })
    }

    const firstHrmReading = hrmData?.[0]
    if (
      timerData.isRunning &&
      firstHrmReading &&
      firstHrmReading.value !== null
    ) {
      dispatch({ type: 'ADD_HR_DATA', payload: firstHrmReading.value })
    }

    if (!timerData.isRunning && state.sessionStartTime !== null) {
      dispatch({
        type: 'END_SESSION',
        payload: {
          duration: timerData.timeElapsed,
          calories: timerData.caloriesBurned,
        },
      })
    }
  }, [timerData, hrmData, state.sessionStartTime])

  useEffect(() => {
    import('@/lib/fit-generator')
      .then((module) => {
        setFitGenerator(() => module.generateFitFile)
      })
      .catch((error) =>
        console.error('Failed to load FIT file generator:', error)
      )
  }, [])

  const handleExport = () => {
    if (
      state.workoutBuffer.length === 0 ||
      !state.sessionStartTime ||
      !fitGenerator
    )
      return

    const blob = fitGenerator({
      startTime: state.sessionStartTime,
      durationSeconds: state.workoutDuration,
      totalCalories: state.caloriesBurned,
      records: state.workoutBuffer,
      age: userSettings.userAge ?? undefined,
      weightKg: userSettings.userWeight ?? undefined,
    })

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `workout-${new Date().toISOString()}.fit`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 2, sm: 3 } }}>
      <Paper sx={{ p: 2 }}>
        <Typography variant="h4" gutterBottom>
          Workout Summary
        </Typography>
        {!webSocketContext ? (
          <Typography>Loading...</Typography>
        ) : (
          <Box>
            <Typography>
              Duration: {state.workoutDuration.toFixed(2)} seconds
            </Typography>
            <Typography>
              Calories Burned: {state.caloriesBurned.toFixed(2)}
            </Typography>
            <Typography>
              Data Points Recorded: {state.workoutBuffer.length}
            </Typography>
          </Box>
        )}
        <Button
          variant="contained"
          onClick={handleExport}
          disabled={
            state.workoutBuffer.length === 0 ||
            !timerData ||
            timerData.isRunning
          }
          sx={{ mt: 2 }}
        >
          Download FIT File
        </Button>
      </Paper>
    </Container>
  )
}

export default ExperimentalWorkoutPage
