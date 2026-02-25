/** @jest-environment jsdom */
import { renderHook, act } from '@testing-library/react'
import { useConnectUserProfile } from '../../../hooks/useConnectUserProfile'
import { useUserSettings } from '@/context/UserSettingsContext'
import { useHeightInput } from '../../../hooks/useHeightInput'
import {
  validateAgeValue,
  validateWeightValue,
} from '@/lib/validation/userMetrics'

// Mock dependencies
jest.mock('@/context/UserSettingsContext')
jest.mock('../../../hooks/useHeightInput')
jest.mock('@/lib/validation/userMetrics')

describe('useConnectUserProfile', () => {
  const mockSetUserSettings = jest.fn()
  const mockUserSettings = {
    userName: 'Test User',
    userAge: 30,
    userWeight: 70, // kg
    userHeight: 175, // cm
    gender: 'FEMALE',
    unitSystem: 'METRIC',
  }

  const mockUpdateHeight = jest.fn()
  const mockCommitHeight = jest.fn()
  const mockHeightState = { cm: '175', feet: '5', inches: '9' }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useUserSettings as jest.Mock).mockReturnValue([
      mockUserSettings,
      mockSetUserSettings,
    ])
    ;(useHeightInput as jest.Mock).mockReturnValue({
      displayHeight: mockHeightState,
      updateHeight: mockUpdateHeight,
      commitHeight: mockCommitHeight,
      error: null,
    })
    ;(validateAgeValue as jest.Mock).mockReturnValue(null)
    ;(validateWeightValue as jest.Mock).mockReturnValue(null)
  })

  it('should initialize with data from UserSettingsContext', () => {
    const { result } = renderHook(() => useConnectUserProfile())

    expect(result.current.data.userName).toBe('Test User')
    expect(result.current.data.userAge).toBe('30')
    expect(result.current.data.userAgeNum).toBe(30)
    expect(result.current.data.userWeight).toBe('70')
    expect(result.current.data.userWeightKg).toBe(70)
    expect(result.current.data.userHeight).toEqual(mockHeightState)
    expect(result.current.data.userHeightCm).toBe(175)
    expect(result.current.data.gender).toBe('FEMALE')
    expect(result.current.data.unitSystem).toBe('METRIC')
  })

  it('should call setUserName when handlers.setUserName is called', () => {
    const { result } = renderHook(() => useConnectUserProfile())

    act(() => {
      result.current.handlers.setUserName('New Name')
    })

    expect(mockSetUserSettings).toHaveBeenCalledWith(expect.any(Function))
    const updater = mockSetUserSettings.mock.calls[0][0]
    expect(updater(mockUserSettings)).toEqual(
      expect.objectContaining({ userName: 'New Name' })
    )
  })

  it('should call setUserAge and validate on blur', () => {
    const { result } = renderHook(() => useConnectUserProfile())

    act(() => {
      result.current.handlers.setUserAge('35')
    })

    expect(mockSetUserSettings).toHaveBeenCalledWith(expect.any(Function))

    act(() => {
      result.current.handlers.onAgeBlur()
    })

    expect(validateAgeValue).toHaveBeenCalledWith('30') // uses current state from context
  })

  it('should handle weight changes and validation', () => {
    const { result } = renderHook(() => useConnectUserProfile())

    act(() => {
      result.current.handlers.setUserWeight('75')
    })

    // local state update doesn't trigger context update yet
    expect(mockSetUserSettings).not.toHaveBeenCalled()
    expect(result.current.data.userWeight).toBe('75')

    act(() => {
      result.current.handlers.onWeightBlur()
    })

    expect(validateWeightValue).toHaveBeenCalledWith('75', 'METRIC')
    expect(mockSetUserSettings).toHaveBeenCalledWith(expect.any(Function))
    const updater = mockSetUserSettings.mock.calls[0][0]
    expect(updater(mockUserSettings)).toEqual(
      expect.objectContaining({ userWeight: 75 })
    )
  })

  it('should handle unit system changes', () => {
    const { result } = renderHook(() => useConnectUserProfile())

    act(() => {
      result.current.handlers.onUnitChange('IMPERIAL')
    })

    expect(mockSetUserSettings).toHaveBeenCalledWith(expect.any(Function))
    const updater = mockSetUserSettings.mock.calls[0][0]
    expect(updater(mockUserSettings)).toEqual(
      expect.objectContaining({ unitSystem: 'IMPERIAL' })
    )
  })

  it('should handle gender changes', () => {
    const { result } = renderHook(() => useConnectUserProfile())

    act(() => {
      result.current.handlers.setGender('MALE')
    })

    expect(mockSetUserSettings).toHaveBeenCalledWith(expect.any(Function))
    const updater = mockSetUserSettings.mock.calls[0][0]
    expect(updater(mockUserSettings)).toEqual(
      expect.objectContaining({ gender: 'MALE' })
    )
  })

  it('should delegate height operations to useHeightInput', () => {
    const { result } = renderHook(() => useConnectUserProfile())

    const newHeight = { cm: '180' }
    act(() => {
      result.current.handlers.setUserHeight(newHeight)
    })
    expect(mockUpdateHeight).toHaveBeenCalledWith(newHeight)

    act(() => {
      result.current.handlers.onHeightBlur()
    })
    expect(mockCommitHeight).toHaveBeenCalled()
  })

  it('should commit weight and height on unmount', () => {
    const { result, unmount } = renderHook(() => useConnectUserProfile())

    act(() => {
      result.current.handlers.setUserWeight('80')
    })

    unmount()

    expect(mockCommitHeight).toHaveBeenCalled()
    expect(mockSetUserSettings).toHaveBeenCalledWith(expect.any(Function))
    const updater = mockSetUserSettings.mock.calls[0][0]
    expect(updater(mockUserSettings)).toEqual(
      expect.objectContaining({ userWeight: 80 })
    )
  })
})
