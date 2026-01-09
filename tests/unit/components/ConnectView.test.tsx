/**
 * @jest-environment jsdom
 */
import React from 'react'
import { render, screen } from '@testing-library/react'
import ConnectView from '@/app/client/connect/components/ConnectView'
import { UserSettingsProvider } from '@/context/UserSettingsContext'
import { WebSocketProvider } from '@/context/WebSocketContext'
import BluetoothHRMProvider from '@/context/BluetoothHRMContext'

// Mock the hooks used within ConnectView
jest.mock('@/hooks/useAutoConnect', () => ({
  useAutoConnect: () => ({
    autoConnectStatus: 'default',
    setAutoConnectStatus: jest.fn(),
  }),
}))

jest.mock('@/hooks/useHrmBroadcaster', () => ({
  useHrmBroadcaster: () => ({
    isBroadcasting: false,
  }),
}))

// Mock the UserSettingsForm component
jest.mock(
  '@/app/client/connect/components/UserSettingsForm',
  () => () => <div>UserSettingsForm</div>
)
// Mock the DeviceConnection component
jest.mock(
  '@/app/client/connect/components/DeviceConnection',
  () => () => <div>DeviceConnection</div>
)

describe('ConnectView', () => {
  it('renders the main connection status heading', () => {
    render(
      <WebSocketProvider>
        <UserSettingsProvider>
          <BluetoothHRMProvider>
            <ConnectView />
          </BluetoothHRMProvider>
        </UserSettingsProvider>
      </WebSocketProvider>
    )

    const heading = screen.getByRole('heading', {
      name: /connection status/i,
    })
    expect(heading).toBeInTheDocument()
    expect(screen.getByText('UserSettingsForm')).toBeInTheDocument()
    expect(screen.getByText('DeviceConnection')).toBeInTheDocument()
  })
})
