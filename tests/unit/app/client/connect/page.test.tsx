/** @jest-environment jsdom */
// tests/unit/app/client/connect/page.test.tsx
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import ConnectPage from '@/app/client/connect/page'
import { UserSettingsProvider } from '@/context/UserSettingsContext'
import '@testing-library/jest-dom'
import { WebSocketProvider } from '@/context/WebSocketContext'
import { SessionProvider } from 'next-auth/react'

// Mock hooks
jest.mock('@/context/WebSocketContext', () => ({
  ...jest.requireActual('@/context/WebSocketContext'),
  useWebSocket: () => ({
    hrmData: [],
    connectionStatus: 'Connected',
    activeAlerts: [],
  }),
}))

jest.mock('@/hooks/useBluetoothHRM', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    connectAndStream: jest.fn(),
    disconnect: jest.fn(),
    deviceStatus: 'Disconnected',
    batteryLevel: null,
    isConnected: false,
    isSupported: true,
    attemptReconnection: jest.fn(),
  })),
}));

describe('ConnectPage', () => {
    beforeAll(() => {
        global.fetch = jest.fn(() =>
        Promise.resolve({
            json: () => Promise.resolve({}),
        })
        ) as jest.Mock;
    });

  it('renders all settings fields', () => {
    render(
      <SessionProvider>
        <WebSocketProvider>
          <UserSettingsProvider>
            <ConnectPage />
          </UserSettingsProvider>
        </WebSocketProvider>
      </SessionProvider>
    )

    expect(screen.getByLabelText('Name')).toBeInTheDocument()
    expect(screen.getByLabelText('Age')).toBeInTheDocument()
    expect(screen.getByLabelText('Weight (kg)')).toBeInTheDocument()
  })

  it('shows an error for invalid name', () => {
    render(
      <SessionProvider>
        <WebSocketProvider>
          <UserSettingsProvider>
            <ConnectPage />
          </UserSettingsProvider>
        </WebSocketProvider>
      </SessionProvider>
    )
    const nameInput = screen.getByLabelText('Name')
    fireEvent.blur(nameInput)
    expect(screen.getByText('Name is required.')).toBeInTheDocument()
  })

  it('shows an error for invalid age', () => {
    render(
      <SessionProvider>
        <WebSocketProvider>
          <UserSettingsProvider>
            <ConnectPage />
          </UserSettingsProvider>
        </WebSocketProvider>
      </SessionProvider>
    )
    const ageInput = screen.getByLabelText('Age')
    fireEvent.change(ageInput, { target: { value: '200' } })
    fireEvent.blur(ageInput)
    expect(
      screen.getByText('Invalid age. Must be between 1 and 120.')
    ).toBeInTheDocument()
  })

  it('shows an error for invalid weight', () => {
    render(
      <SessionProvider>
        <WebSocketProvider>
          <UserSettingsProvider>
            <ConnectPage />
          </UserSettingsProvider>
        </WebSocketProvider>
      </SessionProvider>
    )
    const weightInput = screen.getByLabelText('Weight (kg)')
    fireEvent.change(weightInput, { target: { value: '400' } })
    fireEvent.blur(weightInput)
    expect(
      screen.getByText('Invalid weight. Must be between 20 and 300.')
    ).toBeInTheDocument()
  })
})
