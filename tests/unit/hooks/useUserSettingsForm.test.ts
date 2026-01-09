/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react'
import { useUserSettingsForm } from '../../../hooks/useUserSettingsForm'
import { UserSettings } from '../../../types'
import { MeasurementSystem, Gender } from '../../../types/core'

const initialSettings: UserSettings = {
  userName: 'Test User',
  userAge: 30,
  maxHr: 190,
  restingHr: 60,
  gender: Gender.FEMALE,
  measurementSystem: MeasurementSystem.METRIC,
  userWeight: 70,
  userHeight: 170,
}

describe('useUserSettingsForm', () => {
  it('should initialize with the provided initial state', () => {
    const onSave = jest.fn()
    const { result } = renderHook(() =>
      useUserSettingsForm(initialSettings, onSave)
    )
    expect(result.current.state).toEqual(initialSettings)
  })

  it('should handle field changes correctly', () => {
    const onSave = jest.fn()
    const { result } = renderHook(() =>
      useUserSettingsForm(initialSettings, onSave)
    )

    act(() => {
      result.current.handleChange('userName', 'New Name')
    })

    expect(result.current.state.userName).toBe('New Name')
  })

  it('should handle gender changes', () => {
    const onSave = jest.fn()
    const { result } = renderHook(() =>
      useUserSettingsForm(initialSettings, onSave)
    )

    act(() => {
      result.current.handleChange('gender', Gender.MALE)
    })

    expect(result.current.state.gender).toBe(Gender.MALE)
  })

  it('should handle measurement system changes', () => {
    const onSave = jest.fn()
    const { result } = renderHook(() =>
      useUserSettingsForm(initialSettings, onSave)
    )

    act(() => {
      result.current.handleChange(
        'measurementSystem',
        MeasurementSystem.IMPERIAL
      )
    })

    expect(result.current.state.measurementSystem).toBe(
      MeasurementSystem.IMPERIAL
    )
  })

  it('should call onSave with the current state when handleSave is called', () => {
    const onSave = jest.fn()
    const { result } = renderHook(() =>
      useUserSettingsForm(initialSettings, onSave)
    )

    act(() => {
      result.current.handleChange('userAge', 35)
    })

    act(() => {
      result.current.handleSave()
    })

    expect(onSave).toHaveBeenCalledWith({ ...initialSettings, userAge: 35 })
  })

  it('should update the state when setSettings is called', () => {
    const onSave = jest.fn()
    const { result } = renderHook(() =>
      useUserSettingsForm(initialSettings, onSave)
    )

    const newSettings: UserSettings = {
      userName: 'Updated User',
      userAge: 40,
      maxHr: 180,
      restingHr: 55,
      gender: Gender.MALE,
      measurementSystem: MeasurementSystem.IMPERIAL,
      userWeight: 180,
      userHeight: 72,
    }

    act(() => {
      result.current.setSettings(newSettings)
    })

    expect(result.current.state).toEqual(newSettings)
  })
})
