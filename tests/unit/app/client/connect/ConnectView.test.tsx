/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import ConnectView from '../../../../../app/client/connect/ConnectView'
import React from 'react'

jest.mock('../../../../../app/client/connect/UserSettings', () => {
  const UserSettings = () => <div>UserSettings Mock</div>
  UserSettings.displayName = 'UserSettings'
  return UserSettings
})

jest.mock('../../../../../app/client/connect/ConnectionManager', () => {
  const ConnectionManager = () => <div>ConnectionManager Mock</div>
  ConnectionManager.displayName = 'ConnectionManager'
  return ConnectionManager
})

jest.mock('../../../../../app/client/connect/WorkoutManager', () => {
  const WorkoutManager = () => <div>WorkoutManager Mock</div>
  WorkoutManager.displayName = 'WorkoutManager'
  return WorkoutManager
})

jest.mock('../../../../../components/BottomNavBar', () => {
  const BottomNavBar = () => <div>BottomNavBar Mock</div>
  BottomNavBar.displayName = 'BottomNavBar'
  return BottomNavBar
})

describe('ConnectView', () => {
  const defaultProps = {
    userName: 'Test User',
    setUserName: jest.fn(),
    userAge: '30',
    setUserAge: jest.fn(),
    weightInKg: '70',
    setWeightInKg: jest.fn(),
    isConnected: false,
    isSupported: true,
    deviceStatus: 'disconnected',
    batteryLevel: null,
    currentHR: 0,
    hrZoneProps: { percentage: 0, progressColor: 'grey.500' },
    connectionStatus: 'disconnected',
    onConnect: jest.fn(),
    onDisconnect: jest.fn(),
    onForgetDevice: jest.fn(),
    disconnectionReason: null,
  }

  it('renders UserSettings when not connected and workout has not started', () => {
    render(<ConnectView {...defaultProps} />)
    expect(screen.getByText('UserSettings Mock')).toBeInTheDocument()
    expect(screen.getByText('ConnectionManager Mock')).toBeInTheDocument()
    expect(screen.getByText('WorkoutManager Mock')).toBeInTheDocument()
  })

  it('shows user details and hides UserSettings when connected', () => {
    render(<ConnectView {...defaultProps} isConnected={true} />)
    expect(screen.queryByText('UserSettings Mock')).not.toBeInTheDocument()
    expect(screen.getByText('Connected as')).toBeInTheDocument()
    expect(screen.getByText('Test User')).toBeInTheDocument()
  })
})
