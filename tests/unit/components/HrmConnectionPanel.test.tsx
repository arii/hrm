/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import HrmConnectionPanel from '@/components/HrmConnectionPanel'
import '@testing-library/jest-dom'
import { useWorkoutSession } from '@/hooks/useWorkoutSession'
import { useWebSocket } from '@/context/WebSocketContext'
import { useSession } from 'next-auth/react'
import { UserSettingsProvider } from '@/context/UserSettingsContext'

// Mock the hooks
jest.mock('@/hooks/useWorkoutSession')
jest.mock('@/context/WebSocketContext')
jest.mock('next-auth/react')
jest.mock('@/hooks/useBluetoothHRM', () => ({
  __esModule: true,
  default: () => ({
    connectAndStream: jest.fn(),
    disconnect: jest.fn(),
    deviceStatus: 'Disconnected',
    batteryLevel: null,
    isConnected: false,
    isSupported: true,
  }),
}))

describe('HrmConnectionPanel - Workout Data Integration', () => {
  beforeEach(() => {
    ;(useSession as jest.Mock).mockReturnValue({
      data: { user: { name: 'Test User' } },
    })
    ;(useWebSocket as jest.Mock).mockReturnValue({
      hrmData: [
        { clientId: '1', name: 'Primary User', value: 120, totalCalories: 200 },
        { clientId: '2', name: 'Other User', value: 110, totalCalories: 150 },
      ],
      connectionStatus: 'Connected',
      activeAlerts: [],
    })
  })

  it('passes workout data to primary user HrTile', () => {
    ;(useWorkoutSession as jest.Mock).mockReturnValue({
      caloriesBurned: 50,
      workoutDuration: 300,
      hasStarted: true,
    })

    render(
      <UserSettingsProvider>
        <HrmConnectionPanel />
      </UserSettingsProvider>
    )

    // The primary user should have calories and duration displayed
    expect(screen.getByText('50')).toBeInTheDocument()
    expect(screen.getByText('05:00')).toBeInTheDocument()
  })

  it('correctly identifies primary user', () => {
    ;(useWebSocket as jest.Mock).mockReturnValue({
      hrmData: [
        { clientId: '1', name: 'User with 0 HR', value: 0, totalCalories: 100 },
        { clientId: '2', name: 'new user', value: 130, totalCalories: 180 },
        {
          clientId: '3',
          name: 'Real Primary User',
          value: 140,
          totalCalories: 250,
        },
      ],
      connectionStatus: 'Connected',
      activeAlerts: [],
    })

    ;(useWorkoutSession as jest.Mock).mockReturnValue({
      caloriesBurned: 70,
      workoutDuration: 420,
      hasStarted: true,
    })

    render(
      <UserSettingsProvider>
        <HrmConnectionPanel />
      </UserSettingsProvider>
    )

    // The workout data should be associated with the "Real Primary User"
    expect(screen.getByText('70')).toBeInTheDocument()
    expect(screen.getByText('07:00')).toBeInTheDocument()
  })
})
