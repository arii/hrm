'use client'
import dynamic from 'next/dynamic'
import { UserSettings } from '@/types'
import VerifyProviders from './VerifyProviders'

const WorkoutExport = dynamic(() => import('@/components/WorkoutExport'), {
  ssr: false,
})

const mockUserSettings: UserSettings = {
  userName: 'Test User',
  userAge: 30,
  userWeight: 70,
  gender: 'MALE',
  restingHr: 60,
  maxHr: 190,
  deviceId: 'mock-device-id',
}

const mockWorkoutRecords = [
  { time: Date.now() - 10000, hr: 120 },
  { time: Date.now() - 9000, hr: 122 },
  { time: Date.now() - 8000, hr: 125 },
]

const mockWorkoutData = {
  startTime: Date.now() - 10000,
  durationSeconds: 300,
  totalCalories: 100,
  records: mockWorkoutRecords,
  userAge: mockUserSettings.userAge,
  userWeight: mockUserSettings.userWeight,
  gender: mockUserSettings.gender?.toLowerCase() as 'male' | 'female' | undefined,
}

export default function VerifyPage() {
  return (
    <VerifyProviders>
      <div style={{ padding: '20px', backgroundColor: '#121212', height: '100vh' }}>
        <WorkoutExport workoutData={mockWorkoutData} />
      </div>
    </VerifyProviders>
  )
}
