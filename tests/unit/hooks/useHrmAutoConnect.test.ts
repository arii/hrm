/**
 * @jest-environment jsdom
 */
// File: tests/unit/hooks/useHrmAutoConnect.test.ts
import { renderHook } from '@testing-library/react'
import useHrmAutoConnect from '@/hooks/useHrmAutoConnect'
import { Session } from 'next-auth'
import { UserPreferences } from '@/hooks/useUserPreferences'

describe('useHrmAutoConnect', () => {
  const mockConnectAndStream = jest.fn()

  const defaultProps = {
    connectionStatus: 'Connected',
    deviceStatus: 'Disconnected',
    session: { user: { name: 'Test User' } } as Session,
    userSettings: { userName: 'Settings User', userAge: 30 } as UserPreferences,
    connectAndStream: mockConnectAndStream,
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should call connectAndStream when conditions are met', () => {
    renderHook(() => useHrmAutoConnect(defaultProps))
    expect(mockConnectAndStream).toHaveBeenCalledWith('Test User', 30)
  })

  it('should not call connectAndStream if connectionStatus is not "Connected"', () => {
    renderHook(() =>
      useHrmAutoConnect({
        ...defaultProps,
        connectionStatus: 'Disconnected',
      })
    )
    expect(mockConnectAndStream).not.toHaveBeenCalled()
  })

  it('should not call connectAndStream if deviceStatus is not "Disconnected"', () => {
    renderHook(() =>
      useHrmAutoConnect({ ...defaultProps, deviceStatus: 'Connected' })
    )
    expect(mockConnectAndStream).not.toHaveBeenCalled()
  })

  it('should use userSettings userName if session is null', () => {
    renderHook(() =>
      useHrmAutoConnect({ ...defaultProps, session: null })
    )
    expect(mockConnectAndStream).toHaveBeenCalledWith('Settings User', 30)
  })
})
