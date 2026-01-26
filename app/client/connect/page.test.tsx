/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent, act } from '@testing-library/react'
import ConnectPage from './page'
import { useWorkoutSession } from '@/hooks/useWorkoutSession'
import useBluetoothHRM from '@/hooks/useBluetoothHRM'

jest.mock('@/hooks/useWorkoutSession')
jest.mock('@/hooks/useBluetoothHRM')

describe('ConnectPage', () => {
  it('renders without crashing', () => {
    // Mock the hooks with default values
    (useWorkoutSession as jest.Mock).mockReturnValue({
      workoutDuration: 0,
      caloriesBurned: 0,
      resetWorkout: jest.fn(),
      startWorkout: jest.fn(),
      pauseWorkout: jest.fn(),
      endWorkout: jest.fn(),
      workoutStatus: 'idle',
      hasStarted: false,
    });
    (useBluetoothHRM as jest.Mock).mockReturnValue({
      connectAndStream: jest.fn(),
      disconnect: jest.fn(),
      forgetDevice: jest.fn(),
      deviceStatus: 'Disconnected',
      batteryLevel: null,
      isConnected: false,
      isDataStale: false,
      isSupported: true,
      signalPeriodMs: 0,
    })

    render(<ConnectPage />)
    expect(screen.getByText('Connect Heart Rate Monitor')).toBeInTheDocument()
  })
})
