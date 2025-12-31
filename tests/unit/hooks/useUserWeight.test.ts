/** @jest-environment jsdom */
import React from 'react'
import { renderHook, act } from '@testing-library/react'
import { useUserWeight } from '@/hooks/useUserWeight'
import { UserPhysicalProfileProvider } from '@/context/UserPhysicalProfileContext'

const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <UserPhysicalProfileProvider>{children}</UserPhysicalProfileProvider>
)

describe('useUserWeight', () => {
  it('should return default weight and setter', () => {
    const { result } = renderHook(() => useUserWeight(), { wrapper })

    expect(result.current[0]).toBe(70) // Default from context
    expect(typeof result.current[1]).toBe('function')
  })

  it('should update weight through the context', () => {
    const { result } = renderHook(() => useUserWeight(), { wrapper })

    act(() => {
      result.current[1](75)
    })

    expect(result.current[0]).toBe(75)
  })
})
