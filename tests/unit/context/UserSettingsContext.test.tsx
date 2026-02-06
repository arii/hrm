/**
 * @jest-environment jsdom
 */
import React from 'react'
import { renderHook } from '@testing-library/react'
import {
  UserSettingsProvider,
  useUserSettings,
} from '@/context/UserSettingsContext'
import { MAX_HR_DEFAULT } from '@/lib/shared/hr-zones'

// Mock usePersistentStorage
// We need to support different return values for different tests
const mockSetPreferences = jest.fn()
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let mockPreferences: any = {}

jest.mock('@/hooks/usePersistentStorage', () => ({
  __esModule: true,
  default: jest.fn(() => [mockPreferences, mockSetPreferences]),
}))

describe('UserSettingsContext', () => {
  beforeEach(() => {
    mockSetPreferences.mockClear()
    mockPreferences = {}
  })

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <UserSettingsProvider>{children}</UserSettingsProvider>
  )

  it('should provide default values when storage is empty', () => {
    // Simulate legacy storage state (missing maxHeartRate)
    mockPreferences = {
      theme: 'dark',
      volumeLevel: 70,
      // maxHeartRate is missing
    }

    const { result } = renderHook(() => useUserSettings(), { wrapper })

    const [preferences] = result.current

    // We expect it to be merged with default
    expect(preferences.maxHeartRate).toBe(MAX_HR_DEFAULT)
  })
})
