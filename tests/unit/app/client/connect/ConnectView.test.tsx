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
    userHeight: 175,
    setUserHeight: jest.fn(),
    userWeight: '70',
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
    await waitFor(() => {
      expect(
        screen.getByText('Please enter a valid age')
      ).toBeInTheDocument()
    })
  })

  it('switches between metric and imperial units', () => {
    const { rerender } = render(<ConnectView {...mockProps} />)
    expect(screen.getByLabelText('Your Height (cm)')).toBeInTheDocument()

    fireEvent.click(screen.getByLabelText('imperial'))
    expect(mockProps.onUnitChange).toHaveBeenCalledWith('IMPERIAL')

    rerender(<ConnectView {...mockProps} unitSystem="IMPERIAL" />)
    expect(screen.getByLabelText('Feet')).toBeInTheDocument()
    expect(screen.getByLabelText('Inches')).toBeInTheDocument()
  })

  it('converts and validates imperial height on change and blur', () => {
    render(<ConnectView {...mockProps} unitSystem="IMPERIAL" />)
    const feetInput = screen.getByLabelText('Feet')
    const inchesInput = screen.getByLabelText('Inches')

    fireEvent.change(feetInput, { target: { value: '6' } })
    fireEvent.change(inchesInput, { target: { value: '0' } })

    expect(mockProps.setUserHeight).toHaveBeenCalledWith(182.88)

    fireEvent.blur(feetInput)
    expect(screen.queryByText('Please enter a valid height')).toBeNull()
  })
})
