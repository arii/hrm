/**
 * @jest-environment jsdom
 */
import { jest } from '@jest/globals'
import { act, renderHook } from '@testing-library/react'
import { useAudioContext } from '@/context/AudioContext'
import React from 'react'

jest.mock('@/utils/audioManager', () => ({
  audioManager: {
    setMuted: jest.fn(),
    setVolume: jest.fn(),
  },
  clampVolume: jest.fn((val) => val),
}))

import { AudioProvider } from '@/context/AudioContext'

describe('context/AudioContext (useAudioPreference)', () => {
  const mockGetItem = jest.fn()
  const mockSetItem = jest.fn()

  beforeAll(() => {
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: mockGetItem,
        setItem: mockSetItem,
      },
      writable: true,
    })
  })

  beforeEach(() => {
    jest.clearAllMocks()
    mockGetItem.mockReturnValue(null)
  })

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AudioProvider>{children}</AudioProvider>
  )

  it('initializes with default volume', () => {
    const { result } = renderHook(() => useAudioContext(), { wrapper })
    expect(result.current.volume).toBe(70)
    expect(result.current.muted).toBe(false)
  })

  it('updates volume and mute state', () => {
    const { result } = renderHook(() => useAudioContext(), { wrapper })

    act(() => {
      result.current.setVolume(50)
    })

    expect(result.current.volume).toBe(50)
    expect(result.current.muted).toBe(false)

    act(() => {
      result.current.toggleMute()
    })

    expect(result.current.muted).toBe(true)
    expect(result.current.volume).toBe(0)
  })
})
