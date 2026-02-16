/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react'
import { useConnectSettings } from '@/app/client/connect/hooks/useConnectSettings'
import { useUserSettings } from '@/context/UserSettingsContext'
import { useHeightInput } from '@/hooks/useHeightInput'

jest.mock('@/context/UserSettingsContext')
jest.mock('@/hooks/useHeightInput')

import { UserPreferences } from '@/context/UserSettingsContext'

describe('useConnectSettings', () => {
  let mockUserSettings: UserPreferences
  let setUserSettings: jest.Mock

  beforeEach(() => {
    setUserSettings = jest.fn()
    mockUserSettings = {
      userName: 'Test User',
      userAge: 30,
      userWeight: 70,
      gender: 'MALE',
      unitSystem: 'METRIC',
      hrZoneMethod: 'MAX_HR',
      maxHrOverride: null,
      restingHr: null,
      customZoneThresholds: {},
    }
    ;(useUserSettings as jest.Mock).mockReturnValue([
      mockUserSettings,
      setUserSettings,
    ])
    ;(useHeightInput as jest.Mock).mockReturnValue({
      displayHeight: { cm: '175', feet: '5', inches: '9' },
      updateHeight: jest.fn(),
      commitHeight: jest.fn(),
      error: null,
    })
  })

  it('initializes with values from userSettings', () => {
    const { result } = renderHook(() => useConnectSettings())

    expect(result.current.userName).toBe('Test User')
    expect(result.current.userAge).toBe(30)
    expect(result.current.displayWeight).toBe('70')
  })

  it('updates localMaxHrOverride and validates it', () => {
    const { result } = renderHook(() => useConnectSettings())

    act(() => {
      result.current.setLocalMaxHrOverride('190')
    })

    expect(result.current.localMaxHrOverride).toBe('190')
    expect(result.current.maxHrError).toBeNull()

    act(() => {
      result.current.setLocalMaxHrOverride('300')
    })
    expect(result.current.maxHrError).toBe(
      'Maximum heart rate seems too high (> 250)'
    )
  })

  it('updates localRestingHr and validates it', () => {
    const { result } = renderHook(() => useConnectSettings())

    act(() => {
      result.current.setLocalRestingHr('60')
    })

    expect(result.current.localRestingHr).toBe('60')
    expect(result.current.restingHrError).toBeNull()

    act(() => {
      result.current.setLocalRestingHr('200')
    })
    expect(result.current.restingHrError).toBe(
      'Resting heart rate seems too high (> 150)'
    )
  })

  it('handles weight changes and blur', () => {
    const { result } = renderHook(() => useConnectSettings())

    act(() => {
      result.current.handleWeightChange('75')
    })

    expect(result.current.displayWeight).toBe('75')

    act(() => {
      result.current.handleWeightBlur()
    })

    expect(setUserSettings).toHaveBeenCalled()
  })

  it('handles unit system change', () => {
    const { result } = renderHook(() => useConnectSettings())

    act(() => {
      result.current.handleUnitChange('IMPERIAL')
    })

    expect(setUserSettings).toHaveBeenCalledWith(expect.any(Function))
    const updater = setUserSettings.mock.calls[0][0]
    const updated = updater(mockUserSettings)
    expect(updated.unitSystem).toBe('IMPERIAL')
  })

  it('handles threshold change and enforces ascending order', () => {
    const { result } = renderHook(() => useConnectSettings())

    act(() => {
      // Set Zone 3 to 85% (default ZONE 4 is 80%, ZONE 2 is 60%)
      result.current.handleThresholdChange('ZONE_3', 85)
    })

    expect(setUserSettings).toHaveBeenCalled()
    const updater =
      setUserSettings.mock.calls[setUserSettings.mock.calls.length - 1][0]
    const updated = updater(mockUserSettings)

    // Zone 3 should be 85
    expect(updated.customZoneThresholds.ZONE_3).toBe(85)
    // Zone 4, 5, 6 should be pushed up to at least 85
    expect(updated.customZoneThresholds.ZONE_4).toBe(85)
    expect(updated.customZoneThresholds.ZONE_5).toBe(90) // Remains 90 because 90 > 85
    expect(updated.customZoneThresholds.ZONE_6).toBe(95) // Remains 95
  })

  it('pushes down preceding zones if threshold decreases', () => {
    const { result } = renderHook(() => useConnectSettings())

    act(() => {
      // Set Zone 4 to 40% (default ZONE 3 is 70%, ZONE 2 is 60%, ZONE 1 is 50%)
      result.current.handleThresholdChange('ZONE_4', 40)
    })

    const updater =
      setUserSettings.mock.calls[setUserSettings.mock.calls.length - 1][0]
    const updated = updater(mockUserSettings)

    expect(updated.customZoneThresholds.ZONE_4).toBe(40)
    expect(updated.customZoneThresholds.ZONE_3).toBe(40)
    expect(updated.customZoneThresholds.ZONE_2).toBe(40)
    expect(updated.customZoneThresholds.ZONE_1).toBe(40)
  })
})
