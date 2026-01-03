/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react-hooks'
import { useUserSettingsForm } from './useUserSettingsForm'
import { useUserSettings } from '@/context/UserSettingsContext'
import { Gender, MeasurementSystem } from '@/types/core'

jest.mock('@/context/UserSettingsContext')

const mockSetUserSettings = jest.fn()

const createMockUserSettings = (overrides = {}) => ({
  userName: 'Test User',
  userAge: 30,
  userWeight: 80,
  gender: 'MALE' as Gender,
  unitSystem: 'METRIC' as MeasurementSystem,
  ...overrides,
})

describe('useUserSettingsForm', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useUserSettings as jest.Mock).mockReturnValue([
      createMockUserSettings(),
      mockSetUserSettings,
    ])
  })

  it('should initialize with the correct values from the UserSettingsContext', () => {
    const { result } = renderHook(() => useUserSettingsForm())

    expect(result.current.userName).toBe('Test User')
    expect(result.current.displayAge).toBe('30')
    expect(result.current.displayWeight).toBe('80')
    expect(result.current.gender).toBe('MALE')
    expect(result.current.unitSystem).toBe('METRIC')
  })

  it('should correctly handle name changes', () => {
    const { result } = renderHook(() => useUserSettingsForm())

    act(() => {
      result.current.handleNameChange('New Name')
    })

    expect(mockSetUserSettings).toHaveBeenCalledWith(expect.any(Function))
    const setUserSettingsFn = mockSetUserSettings.mock.calls[0][0]
    const newSettings = setUserSettingsFn(createMockUserSettings())
    expect(newSettings.userName).toBe('New Name')
  })

  it('should correctly handle age changes, validation, and persistence on blur', () => {
    const { result } = renderHook(() => useUserSettingsForm())

    act(() => {
      result.current.handleAgeChange('35')
    })

    expect(result.current.displayAge).toBe('35')
    expect(result.current.ageError).toBeNull()
    expect(mockSetUserSettings).not.toHaveBeenCalled()

    act(() => {
      result.current.handleAgeBlur()
    })

    expect(mockSetUserSettings).toHaveBeenCalledWith(expect.any(Function))
    const setUserSettingsFn = mockSetUserSettings.mock.calls[0][0]
    const newSettings = setUserSettingsFn(createMockUserSettings())
    expect(newSettings.userAge).toBe(35)
    expect(result.current.displayAge).toBe('30') // Should revert to the context value
  })

  it('should display an error for invalid age input and not persist', () => {
    const { result } = renderHook(() => useUserSettingsForm())

    act(() => {
      result.current.handleAgeChange('abc')
    })

    expect(result.current.displayAge).toBe('abc')
    expect(result.current.ageError).toBe('Invalid age')

    act(() => {
      result.current.handleAgeBlur()
    })

    expect(mockSetUserSettings).not.toHaveBeenCalled()
    expect(result.current.ageError).toBe('Invalid age')
  })

  it('should correctly handle weight changes, validation, and persistence on blur', () => {
    const { result } = renderHook(() => useUserSettingsForm())

    act(() => {
      result.current.handleWeightChange('85')
    })

    expect(result.current.displayWeight).toBe('85')
    expect(result.current.weightError).toBeNull()

    act(() => {
      result.current.handleWeightBlur()
    })

    expect(mockSetUserSettings).toHaveBeenCalledWith(expect.any(Function))
    const setUserSettingsFn = mockSetUserSettings.mock.calls[0][0]
    const newSettings = setUserSettingsFn(createMockUserSettings())
    expect(newSettings.userWeight).toBe(85)
    expect(result.current.displayWeight).toBe('80') // Should revert to the context value
  })

  it('should display an error for invalid weight input and not persist', () => {
    const { result } = renderHook(() => useUserSettingsForm())

    act(() => {
      result.current.handleWeightChange('abc')
    })

    expect(result.current.displayWeight).toBe('abc')
    expect(result.current.weightError).toBe('Invalid weight')

    act(() => {
      result.current.handleWeightBlur()
    })

    expect(mockSetUserSettings).not.toHaveBeenCalled()
    expect(result.current.weightError).toBe('Invalid weight')
  })

  it('should correctly handle unit system changes', () => {
    const { result, rerender } = renderHook(() => useUserSettingsForm())

    act(() => {
      result.current.handleUnitChange('IMPERIAL')
    })

    // After the unit system change, the useUserSettings mock needs to be updated
    ;(useUserSettings as jest.Mock).mockReturnValue([
      createMockUserSettings({ unitSystem: 'IMPERIAL' }),
      mockSetUserSettings,
    ])

    rerender()

    expect(mockSetUserSettings).toHaveBeenCalledWith(expect.any(Function))
    const setUserSettingsFn = mockSetUserSettings.mock.calls[0][0]
    const newSettings = setUserSettingsFn(createMockUserSettings())
    expect(newSettings.unitSystem).toBe('IMPERIAL')
    expect(result.current.displayWeight).toBe('176.37')
  })
})
