
/**
 * @jest-environment jsdom
 */
import React from 'react'
import { renderHook, act } from '@testing-library/react'
import useAutoConnect from '@/hooks/useAutoConnect'
import { UserSettingsProvider, useUserSettings } from '@/context/UserSettingsContext'
import { getCookie } from '@/utils/cookie'

jest.mock('@/utils/cookie', () => ({
  getCookie: jest.fn(),
}))

describe('useAutoConnect', () => {
  let connectAndStream: jest.Mock
  let getCookieMock: jest.Mock

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <UserSettingsProvider>{children}</UserSettingsProvider>
  )

  beforeEach(() => {
    connectAndStream = jest.fn()
    getCookieMock = getCookie as jest.Mock
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should not call connectAndStream if autoConnect is false', () => {
    getCookieMock.mockReturnValue('some-device-id')

    renderHook(
      () =>
        useAutoConnect({
          connectAndStream,
          isConnected: false,
        }),
      { wrapper }
    )

    expect(connectAndStream).not.toHaveBeenCalled()
  })

  it('should not call connectAndStream if there is no saved device', () => {
    getCookieMock.mockReturnValue(null)

    renderHook(
      () =>
        useAutoConnect({
          connectAndStream,
          isConnected: false,
        }),
      { wrapper }
    )

    expect(connectAndStream).not.toHaveBeenCalled()
  })

  it('should not call connectAndStream if already connected', () => {
    getCookieMock.mockReturnValue('some-device-id')

    renderHook(
      () =>
        useAutoConnect({
          connectAndStream,
          isConnected: true,
        }),
      { wrapper }
    )

    expect(connectAndStream).not.toHaveBeenCalled()
  })

  it('should call connectAndStream if all conditions are met', () => {
    getCookieMock.mockReturnValue('some-device-id')
    const { result } = renderHook(() => useUserSettings(), { wrapper })
    act(() => {
      result.current[1]({ ...result.current[0], autoConnect: true })
    })


    renderHook(
      () =>
        useAutoConnect({
          connectAndStream,
          isConnected: false,
        }),
      { wrapper }
    )

    expect(connectAndStream).toHaveBeenCalledTimes(1)
  })

  it('should only call connectAndStream once on subsequent renders', () => {
    getCookieMock.mockReturnValue('some-device-id')
    const { result } = renderHook(() => useUserSettings(), { wrapper })
    act(() => {
      result.current[1]({ ...result.current[0], autoConnect: true })
    })

    const { rerender } = renderHook(
      () =>
        useAutoConnect({
          connectAndStream,
          isConnected: false,
        }),
      { wrapper }
    )

    rerender()
    rerender()

    expect(connectAndStream).toHaveBeenCalledTimes(1)
  })
})
