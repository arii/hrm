/**
 * @jest-environment jsdom
 */
import React from 'react'
import { render, screen } from '@testing-library/react'
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
  it('calls connectAndStream when the WebSocket is connected', () => {
    const connectAndStream = jest.fn().mockResolvedValue(undefined)
    ;(useWebSocket as jest.Mock).mockReturnValue({
      connectionStatus: 'Connected',
      hrmData: [],
      activeAlerts: [],
    })
    ;(useBluetoothHRM as jest.Mock).mockReturnValue({ connectAndStream, deviceStatus: 'Disconnected' })
    ;(useSession as jest.Mock).mockReturnValue({ data: null })
    ;(useUserSettings as jest.Mock).mockReturnValue([{}])

    render(<HrmConnectionPanel />)

    expect(connectAndStream).toHaveBeenCalled()
  })
})
