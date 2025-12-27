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

  it('converts weight correctly when switching from imperial to metric', () => {
    const { rerender } = render(
      <ConnectView {...mockProps} unitSystem="IMPERIAL" />
    )
    const weightInput = screen.getByLabelText('Your Weight (lbs)')
    expect(weightInput).toHaveValue(154.3)

    // Swith to metric
    rerender(<ConnectView {...mockProps} unitSystem="METRIC" />)
    const weightInputMetric = screen.getByLabelText('Your Weight (kg)')
    expect(weightInputMetric).toHaveValue(70)
  })

  it('switches between metric and imperial units and preserves height', async () => {
    const { rerender } = render(<ConnectView {...mockProps} />)

    // Initially metric, showing cm
    expect(screen.getByLabelText('Your Height (cm)')).toHaveValue(175)

    // Switch to imperial
    fireEvent.click(screen.getByLabelText('imperial units'))
    rerender(<ConnectView {...mockProps} unitSystem="IMPERIAL" />)

    // Check for feet and inches
    await waitFor(() => {
      expect(screen.getByLabelText('Feet')).toHaveValue(5)
      expect(screen.getByLabelText('Inches')).toHaveValue(9)
    })

    // Change height in imperial
    fireEvent.change(screen.getByLabelText('Feet'), { target: { value: '6' } })
    fireEvent.change(screen.getByLabelText('Inches'), {
      target: { value: '0' },
    })

    await waitFor(() => {
      // 6 feet is ~183 cm
      expect(mockProps.setUserHeight).toHaveBeenCalledWith(183)
    })

    // Switch back to metric
    fireEvent.click(screen.getByLabelText('metric units'))
    rerender(<ConnectView {...mockProps} unitSystem="METRIC" userHeight={183} />)

    // Check if cm value is updated
    expect(screen.getByLabelText('Your Height (cm)')).toHaveValue(183)
  })
})
