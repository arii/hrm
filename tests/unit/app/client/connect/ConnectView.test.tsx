// tests/unit/app/client/connect/ConnectView.test.tsx
import React from 'react'
import { render, fireEvent, waitFor } from '@testing-library/react'
import ConnectView from '@/app/client/connect/ConnectView'

jest.mock('@/hooks/useUserSettings', () => ({
  useUserSettings: () => ({
    userName: 'Test User',
    setUserName: jest.fn(),
    userAge: '30',
    setUserAge: jest.fn(),
    userGender: 'male',
    setUserGender: jest.fn(),
    userHeight: { cm: '180', feet: '5', inches: '11' },
    setUserHeight: jest.fn(),
    userWeight: '75',
    setUserWeight: jest.fn(),
    unit: 'METRIC',
    setUnit: jest.fn(),
    maxHr: 190,
    restingHr: 60,
    savePending: false,
  }),
}))

jest.mock('@/hooks/useHrm', () => ({
  useHrm: () => ({
    isConnected: false,
    deviceStatus: 'Disconnected',
    onConnect: jest.fn(),
    onDisconnect: jest.fn(),
    onForgetDevice: jest.fn(),
    isSupported: true,
    batteryLevel: null,
    bluetoothConnected: false,
  }),
}))

jest.mock('@/hooks/useWorkoutTimer', () => ({
  useWorkoutTimer: () => ({
    onStartWorkout: jest.fn(),
    onEndWorkout: jest.fn(),
    onReset: jest.fn(),
    workoutStatus: 'Not Started',
    hasStarted: false,
    duration: 0,
    caloriesBurned: 0,
  }),
}))

describe('ConnectView', () => {
  it('renders correctly', () => {
    const { getByText } = render(<ConnectView />)
    expect(getByText('HRM Connection')).toBeInTheDocument()
    expect(getByText('User Settings')).toBeInTheDocument()
  })

  it('handles user input', async () => {
    const { getByLabelText } = render(<ConnectView />)
    const nameInput = getByLabelText('Your Name')
    fireEvent.change(nameInput, { target: { value: 'New Name' } })
    await waitFor(() => expect(nameInput).toHaveValue('New Name'))
  })
})
