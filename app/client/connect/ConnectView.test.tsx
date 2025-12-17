/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent } from '@testing-library/react'
import ConnectView from './ConnectView'

import { USER_UNITS } from '../../../constants/units/user'

describe('ConnectView', () => {
  const defaultProps = {
    duration: '00:00:00',
    caloriesBurned: 0,
    userName: 'Test User',
    setUserName: jest.fn(),
    userAge: '30',
    setUserAge: jest.fn(),
    userHeight: '175',
    setUserHeight: jest.fn(),
    userWeight: '70',
    setUserWeight: jest.fn(),
    isConnected: false,
    deviceStatus: 'Disconnected',
    batteryLevel: null,
    onConnect: jest.fn(),
    onDisconnect: jest.fn(),
    onForgetDevice: jest.fn().mockResolvedValue(undefined),
    isSupported: true,
    currentHR: 0,
    hrZoneProps: { percentage: 0, progressColor: 'grey' },
    connectionStatus: 'Disconnected',
    bluetoothConnected: false,
    hasStarted: false,
    onReset: jest.fn(),
    workoutStatus: 'idle' as 'idle' | 'running' | 'paused',
    onStartWorkout: jest.fn(),
    onEndWorkout: jest.fn(),
    userPreferences: {
      theme: 'dark',
      volumeLevel: 100,
      defaultWorkDuration: 25,
      defaultRestDuration: 5,
      favoritePlaylist: null,
      userName: 'Test User',
      userAge: 30,
      units: 'imperial' as (typeof USER_UNITS)[number],
    },
    setUserPreferences: jest.fn(),
  }

  it('shows a validation error for an invalid age', () => {
    render(<ConnectView {...defaultProps} />)
    const ageInput = screen.getByLabelText('Your Age')
    fireEvent.change(ageInput, { target: { value: '200' } })
    fireEvent.blur(ageInput)
    expect(
      screen.getByText('Please enter a valid age (1-120)')
    ).toBeInTheDocument()
  })

  it('does not show a validation error for a valid age', () => {
    render(<ConnectView {...defaultProps} />)
    const ageInput = screen.getByLabelText('Your Age')
    fireEvent.change(ageInput, { target: { value: '35' } })
    fireEvent.blur(ageInput)
    expect(
      screen.queryByText('Please enter a valid age (1-120)')
    ).not.toBeInTheDocument()
  })

  it('shows a validation error for an invalid height', () => {
    render(<ConnectView {...defaultProps} />)
    const heightInput = screen.getByLabelText('Your Height (cm)')
    fireEvent.change(heightInput, { target: { value: '300' } })
    fireEvent.blur(heightInput)
    expect(
      screen.getByText('Please enter a valid height (100-250)')
    ).toBeInTheDocument()
  })

  it('does not show a validation error for a valid height', () => {
    render(<ConnectView {...defaultProps} />)
    const heightInput = screen.getByLabelText('Your Height (cm)')
    fireEvent.change(heightInput, { target: { value: '180' } })
    fireEvent.blur(heightInput)
    expect(
      screen.queryByText('Please enter a valid height (100-250)')
    ).not.toBeInTheDocument()
  })

  it('shows a validation error for an invalid weight', () => {
    render(<ConnectView {...defaultProps} />)
    const weightInput = screen.getByLabelText('Your Weight (kg)')
    fireEvent.change(weightInput, { target: { value: '300' } })
    fireEvent.blur(weightInput)
    expect(
      screen.getByText('Please enter a valid weight (30-200)')
    ).toBeInTheDocument()
  })

  it('does not show a validation error for a valid weight', () => {
    render(<ConnectView {...defaultProps} />)
    const weightInput = screen.getByLabelText('Your Weight (kg)')
    fireEvent.change(weightInput, { target: { value: '75' } })
    fireEvent.blur(weightInput)
    expect(
      screen.queryByText('Please enter a valid weight (30-200)')
    ).not.toBeInTheDocument()
  })

  it('does not show a validation error for an empty age', () => {
    render(<ConnectView {...defaultProps} />)
    const ageInput = screen.getByLabelText('Your Age')
    fireEvent.change(ageInput, { target: { value: '' } })
    fireEvent.blur(ageInput)
    expect(
      screen.queryByText('Please enter a valid age (1-120)')
    ).not.toBeInTheDocument()
  })

  it('does not show a validation error for an empty height', () => {
    render(<ConnectView {...defaultProps} />)
    const heightInput = screen.getByLabelText('Your Height (cm)')
    fireEvent.change(heightInput, { target: { value: '' } })
    fireEvent.blur(heightInput)
    expect(
      screen.queryByText('Please enter a valid height (100-250)')
    ).not.toBeInTheDocument()
  })

  it('does not show a validation error for an empty weight', () => {
    render(<ConnectView {...defaultProps} />)
    const weightInput = screen.getByLabelText('Your Weight (kg)')
    fireEvent.change(weightInput, { target: { value: '' } })
    fireEvent.blur(weightInput)
    expect(
      screen.queryByText('Please enter a valid weight (30-200)')
    ).not.toBeInTheDocument()
  })
})
