/**
 * @jest-environment jsdom
 */
// File: tests/unit/context/UserSettingsContext.test.tsx
import React from 'react'
import { render, act } from '@testing-library/react'
import {
  UserSettingsProvider,
  useUserSettings,
} from '@/context/UserSettingsContext'
import { useWebSocket } from '@/context/WebSocketContext'

// Mock WebSocket context
jest.mock('@/context/WebSocketContext', () => ({
  useWebSocket: jest.fn(),
}))

// Mock localStorage
const localStorageMock = (() => {
  let store: { [key: string]: string } = {}
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString()
    },
    clear: () => {
      store = {}
    },
    removeItem: (key: string) => {
      delete store[key]
    },
  }
})()
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

const mockSendData = jest.fn()
const mockUseWebSocket = useWebSocket as jest.Mock

const TestComponent = () => {
  const settings = useUserSettings()
  return <div data-testid="settings">{JSON.stringify(settings)}</div>
}

describe('UserSettingsContext', () => {
  beforeEach(() => {
    localStorageMock.clear()
    mockUseWebSocket.mockReturnValue({
      sendData: mockSendData,
      connectionStatus: 'Connected',
    })
  })

  it('provides default values', () => {
    const { getByTestId } = render(
      <UserSettingsProvider>
        <TestComponent />
      </UserSettingsProvider>
    )
    const settings = JSON.parse(getByTestId('settings').textContent || '{}')
    expect(settings.unitSystem).toBe('METRIC')
    expect(settings.userName).toBe('Default User')
    expect(settings.userAge).toBe(30)
    expect(settings.weightInKg).toBe(70)
  })

  it('loads values from localStorage', () => {
    localStorageMock.setItem('unitSystem', 'IMPERIAL')
    localStorageMock.setItem('userName', 'Test User')
    localStorageMock.setItem('userAge', '45')
    localStorageMock.setItem('userWeightKg', '80')

    const { getByTestId } = render(
      <UserSettingsProvider>
        <TestComponent />
      </UserSettingsProvider>
    )
    const settings = JSON.parse(getByTestId('settings').textContent || '{}')
    expect(settings.unitSystem).toBe('IMPERIAL')
    expect(settings.userName).toBe('Test User')
    expect(settings.userAge).toBe(45)
    expect(settings.weightInKg).toBe(80)
  })

  it('updates values when setter functions are called', () => {
    const TestComponentWithSetters = () => {
      const settings = useUserSettings()
      return (
        <div>
          <button onClick={() => settings.setUnitSystem('IMPERIAL')}>
            Update Unit System
          </button>
          <button
            onClick={() => {
              settings.setUserName('Jane Doe')
              settings.setUserAge(40)
              settings.setUserWeight(176) // 176 lbs
            }}
          >
            Update User Info
          </button>
        </div>
      )
    }

    const { getByText } = render(
      <UserSettingsProvider>
        <TestComponentWithSetters />
      </UserSettingsProvider>
    )

    act(() => {
      getByText('Update Unit System').click()
    })

    act(() => {
      getByText('Update User Info').click()
    })

    // Verify localStorage is updated
    expect(localStorage.getItem('userName')).toBe('Jane Doe')
    expect(localStorage.getItem('userAge')).toBe('40')
    expect(localStorage.getItem('unitSystem')).toBe('IMPERIAL')
    expect(
      parseFloat(localStorage.getItem('userWeightKg') || '0')
    ).toBeCloseTo(79.83)
  })
})
