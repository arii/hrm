/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react'
import { useUserSettingsForm } from '@/hooks/useUserSettingsForm'
import {
  UserSettingsProvider,
  DEFAULT_PREFERENCES,
} from '@/context/UserSettingsContext'
import { ReactNode } from 'react'

const wrapper = ({ children }: { children: ReactNode }) => (
  <UserSettingsProvider>{children}</UserSettingsProvider>
)

describe('useUserSettingsForm', () => {
  it('should initialize with default values', () => {
    const { result } = renderHook(() => useUserSettingsForm(), { wrapper })
    expect(result.current.formData).toEqual(DEFAULT_PREFERENCES)
  })

  it('should update formData on input change', () => {
    const { result } = renderHook(() => useUserSettingsForm(), { wrapper })

    act(() => {
      result.current.handleInputChange({
        target: { name: 'userName', value: 'Test User' },
      } as React.ChangeEvent<HTMLInputElement>)
    })

    expect(result.current.formData.userName).toBe('Test User')
  })

  it('should update formData on select change', () => {
    const { result } = renderHook(() => useUserSettingsForm(), { wrapper })

    act(() => {
      result.current.handleSelectChange('gender', 'FEMALE')
    })

    expect(result.current.formData.gender).toBe('FEMALE')
  })

  it('should call saveSettings on form submit', () => {
    const { result } = renderHook(() => useUserSettingsForm(), { wrapper })

    act(() => {
      result.current.handleInputChange({
        target: { name: 'userName', value: 'New Name' },
      } as React.ChangeEvent<HTMLInputElement>)
      result.current.handleSelectChange('gender', 'MALE')
      result.current.handleSelectChange('unitSystem', 'METRIC')
    })

    const mockEvent = {
      preventDefault: jest.fn(),
    } as unknown as React.FormEvent<HTMLFormElement>

    act(() => {
      result.current.handleSubmit(mockEvent)
    })

    expect(result.current.formData.userName).toBe('New Name')
    expect(result.current.formData.gender).toBe('MALE')
    expect(result.current.formData.unitSystem).toBe('METRIC')
    expect(mockEvent.preventDefault).toHaveBeenCalled()
  })
})
