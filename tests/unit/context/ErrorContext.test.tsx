/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react'
import { ErrorProvider, useError } from '@/context/ErrorContext'
import { showError } from '@/lib/notifications'
import React from 'react'

jest.mock('@/lib/notifications', () => ({
  showError: jest.fn(),
}))

describe('ErrorContext', () => {
  it('addError calls showError with the correct arguments', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ErrorProvider>{children}</ErrorProvider>
    )
    const { result } = renderHook(() => useError(), { wrapper })

    act(() => {
      result.current.addError('Test error')
    })

    expect(showError).toHaveBeenCalledWith('Test error', undefined)
  })

  it('addError calls showError with the persist option', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ErrorProvider>{children}</ErrorProvider>
    )
    const { result } = renderHook(() => useError(), { wrapper })

    act(() => {
      result.current.addError('Persistent error', { persist: true })
    })

    expect(showError).toHaveBeenCalledWith('Persistent error', {
      persist: true,
    })
  })
})
