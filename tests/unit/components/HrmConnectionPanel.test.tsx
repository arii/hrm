/**
 * @jest-environment jsdom
 */
import React from 'react'
import { render } from '@testing-library/react'
import HrmConnectionPanel from '@/components/HrmConnectionPanel'
import { useWebSocket } from '@/context/WebSocketContext'
import useBluetoothHRM from '@/hooks/useBluetoothHRM'
import { useSession } from 'next-auth/react'
import { useUserSettings } from '@/context/UserSettingsContext'
import '@testing-library/jest-dom'

jest.mock('@/context/WebSocketContext')
jest.mock('@/hooks/useBluetoothHRM')
jest.mock('next-auth/react')
jest.mock('@/context/UserSettingsContext')

describe('HrmConnectionPanel', () => {
  it('calls attemptReconnection with user data when the WebSocket is connected', () => {
    const attemptReconnection = jest.fn().mockResolvedValue(undefined)
    ;(useWebSocket as jest.Mock).mockReturnValue({
      connectionStatus: 'Connected',
      hrmData: [],
      activeAlerts: [],
      timerData: { isRunning: false },
    })
    ;(useBluetoothHRM as jest.Mock).mockReturnValue({
      connectAndStream: jest.fn(),
      disconnect: jest.fn(),
      deviceStatus: 'Disconnected',
      batteryLevel: null,
      isConnected: false,
      isSupported: true,
      attemptReconnection,
    })
    ;(useSession as jest.Mock).mockReturnValue({
      data: { user: { name: 'Test User' } },
    })
    ;(useUserSettings as jest.Mock).mockReturnValue([
      { userName: 'Test User', userAge: 30 },
    ])

    render(<HrmConnectionPanel />)

    expect(attemptReconnection).toHaveBeenCalledWith('Test User', 30)
  })
})
