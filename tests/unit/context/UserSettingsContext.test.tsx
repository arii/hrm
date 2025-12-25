/**
 * @jest-environment jsdom
 */
// tests/unit/context/UserSettingsContext.test.tsx
import React from 'react'
import { render, screen, act } from '@testing-library/react'
import {
  UserSettingsProvider,
  useUserSettings,
} from '@/context/UserSettingsContext'
import { useUserPreferences } from '@/hooks/useUserPreferences'
import { WebSocketProvider } from '@/context/WebSocketContext'

// Mock the useUserPreferences hook to isolate the context provider
jest.mock('@/hooks/useUserPreferences')

// Mock the WebSocketProvider to isolate the context provider
jest.mock('@/context/WebSocketContext', () => ({
  ...jest.requireActual('@/context/WebSocketContext'),
  useWebSocket: () => ({
    sendData: jest.fn(),
    connectionStatus: 'Connected',
  }),
}))

const MockConsumerComponent = () => {
  const [settings, setSettings] = useUserSettings()
  return (
    <div>
      <p data-testid="unit-system">{settings.unitSystem}</p>
      <p data-testid="user-weight">{settings.userWeight}</p>
      <button
        onClick={() =>
          setSettings((prev) => ({ ...prev, unitSystem: 'metric' }))
        }
      >
        Set Metric
      </button>
      <button
        onClick={() => setSettings((prev) => ({ ...prev, userWeight: 200 }))}
      >
        Set Weight
      </button>
    </div>
  )
}

describe('UserSettingsContext', () => {
  let mockSetPrefs: jest.Mock

  beforeEach(() => {
    mockSetPrefs = jest.fn()
    ;(useUserPreferences as jest.Mock).mockReturnValue([
      {
        theme: 'dark',
        volumeLevel: 70,
        defaultWorkDuration: 20,
        defaultRestDuration: 10,
        favoritePlaylist: null,
        userName: null,
        userAge: null,
        unitSystem: 'imperial',
        userWeight: 165,
      },
      mockSetPrefs,
    ])
  })

  it('provides default values to consumers', () => {
    render(
      <WebSocketProvider>
        <UserSettingsProvider>
          <MockConsumerComponent />
        </UserSettingsProvider>
      </WebSocketProvider>
    )

    expect(screen.getByTestId('unit-system').textContent).toBe('imperial')
    expect(screen.getByTestId('user-weight').textContent).toBe('165')
  })

  it('allows consumers to update the settings', () => {
    render(
      <WebSocketProvider>
        <UserSettingsProvider>
          <MockConsumerComponent />
        </UserSettingsProvider>
      </WebSocketProvider>
    )

    act(() => {
      screen.getByText('Set Metric').click()
    })

    expect(mockSetPrefs).toHaveBeenCalled()

    act(() => {
      screen.getByText('Set Weight').click()
    })

    expect(mockSetPrefs).toHaveBeenCalled()
  })
})
