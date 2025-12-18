// components/WorkoutSessionManager.tsx
'use client'
import { useWorkoutSession } from '../hooks/useWorkoutSession'
import { useWorkoutAutoStart } from '../hooks/useWorkoutAutoStart.tsx'
import { useWebSocket } from '../context/WebSocketContext'

const WorkoutSessionManager = () => {
  const { hrmData } = useWebSocket()
  const isConnected = hrmData.length > 0 && hrmData[0].isConnected
  const totalCalories = hrmData.length > 0 ? hrmData[0].calories : 0

  const { startWorkout, workoutStatus } = useWorkoutSession({
    isConnected,
    totalCalories,
  })

  useWorkoutAutoStart({
    startWorkout,
    workoutStatus,
  })

  return null
}

export default WorkoutSessionManager
