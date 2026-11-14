import { WorkoutStatus } from '../../../types/workout'
import { UserProfileState, HrZoneData } from '@/types/connect'

// Shared props contract for ConnectView and its flow-section components.
export interface ConnectViewProps {
  duration: string
  caloriesBurned: number
  userProfile: UserProfileState
  isConnected: boolean
  isDataStale?: boolean
  deviceStatus: string
  batteryLevel: number | null
  onConnect: () => void
  onDisconnect: () => void
  onForgetDevice: () => Promise<void>
  isSupported: boolean
  signalPeriodMs: number
  lastPeriodMs: number
  currentHR: number
  hrZoneData: HrZoneData
  connectionStatus: string
  bluetoothConnected: boolean
  hasStarted: boolean
  onReset: () => void
  workoutStatus: WorkoutStatus
  onStartWorkout: () => void
  onPauseWorkout: () => void
  onEndWorkout: () => void
}
