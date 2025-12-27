/** @jest-environment jsdom */
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ConnectView from '../../../../../app/client/connect/ConnectView'
import { Gender, MeasurementSystem } from '../../../../../types'

describe('ConnectView', () => {
  const mockProps = {
    duration: '00:00',
    caloriesBurned: 0,
    userName: 'Test User',
    setUserName: jest.fn(),
    userAge: '30',
    setUserAge: jest.fn(),
    userHeight: 175, // cm
    setUserHeight: jest.fn(),
    userWeight: '70', // kg
    setUserWeight: jest.fn(),
    gender: 'MALE' as Gender,
    setGender: jest.fn(),
    unitSystem: 'METRIC' as MeasurementSystem,
    onUnitChange: jest.fn(),
    isConnected: false,
    deviceStatus: '',
    batteryLevel: null,
    onConnect: jest.fn(),
    onDisconnect: jest.fn(),
    onForgetDevice: jest.fn().mockResolvedValue(undefined),
    isSupported: true,
    currentHR: 0,
    hrZoneProps: { percentage: 0, progressColor: '' },
    connectionStatus: 'Connected',
    bluetoothConnected: false,
    hasStarted: false,
    onReset: jest.fn(),
    workoutStatus: 'idle' as const,
    onStartWorkout: jest.fn(),
    onEndWorkout: jest.fn(),
  }

  it('renders the component and allows input', () => {
    render(<ConnectView {...mockProps} />)
    expect(screen.getByText('Connect Heart Rate Monitor')).toBeInTheDocument()
    const nameInput = screen.getByLabelText('Your Name')
    fireEvent.change(nameInput, { target: { value: 'New Name' } })
    expect(mockProps.setUserName).toHaveBeenCalledWith('New Name')
  })

  it('displays imperial units correctly', () => {
    // 175 cm is roughly 5 feet 9 inches
    render(<ConnectView {...mockProps} unitSystem="IMPERIAL" />)
    expect(screen.getByLabelText('Feet')).toHaveValue(5)
    expect(screen.getByLabelText('Inches')).toHaveValue(9)
  })

  it('validates age on blur', async () => {
    render(<ConnectView {...mockProps} userAge="" />)
    const ageInput = screen.getByLabelText('Your Age')
    fireEvent.blur(ageInput)
    // Expect an error message to be displayed for invalid age
    await waitFor(() => {
      expect(screen.getByText('Age is required.')).toBeInTheDocument()
    })
  })

  it('converts weight correctly on blur when using imperial units', () => {
    render(<ConnectView {...mockProps} unitSystem="IMPERIAL" />)
    const weightInput = screen.getByLabelText('Your Weight (lbs)')
    // 70kg is ~154.3 lbs
    expect(weightInput).toHaveValue(154.3)

    fireEvent.change(weightInput, { target: { value: '160' } })
    fireEvent.blur(weightInput)

    // Should convert 160 lbs back to kg (~72.57)
    expect(mockProps.setUserWeight).toHaveBeenCalledWith('72.57')
  })
})
