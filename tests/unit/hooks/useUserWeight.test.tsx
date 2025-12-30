/** @jest-environment jsdom */
import { renderHook, act } from '@testing-library/react'
import { useUserWeight } from '@/hooks/useUserWeight'
import { UserPhysicalProfileProvider } from '@/context/UserPhysicalProfileContext'

jest.mock('next-auth/react', () => ({
  useSession: () => ({ data: null, status: 'unauthenticated' }),
}))

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <UserPhysicalProfileProvider>{children}</UserPhysicalProfileProvider>
)

describe('useUserWeight', () => {
  it('should return default weight and setter', () => {
    const { result } = renderHook(() => useUserWeight(), { wrapper })

    expect(result.current[0]).toBe(70)
    expect(typeof result.current[1]).toBe('function')
  })

  it('should update weight', () => {
    const { result } = renderHook(() => useUserWeight(), { wrapper })

    act(() => {
      result.current[1](75)
    })

    expect(result.current[0]).toBe(75)
  })
})
