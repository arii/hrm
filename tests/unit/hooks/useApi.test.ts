// tests/unit/hooks/useApi.test.ts
/** @jest-environment jsdom */
import { renderHook, act } from '@testing-library/react'
import useApi from '@/hooks/useApi'

// Mock the entire context module
jest.mock('@/context/ToastContext')

// Import the mocked hook
import { useToast } from '@/context/ToastContext'

// Typecast the mock for TypeScript
const mockedUseToast = useToast as jest.Mock

describe('useApi', () => {
  const mockAddToast = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    // Set the return value for the mocked hook
    mockedUseToast.mockReturnValue({
      addToast: mockAddToast,
    })
    global.fetch = jest.fn()
  })

  it('should handle a successful API call', async () => {
    const mockData = { message: 'Success' }
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockData),
    })

    const { result } = renderHook(() => useApi())

    await act(async () => {
      await result.current.request('/api/test')
    })

    expect(result.current.data).toEqual(mockData)
    expect(result.current.error).toBeNull()
    expect(result.current.isLoading).toBe(false)
    expect(mockAddToast).not.toHaveBeenCalled()
  })

  it('should handle an API error and show a toast', async () => {
    const mockError = { message: 'API Error' }
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      statusText: 'Bad Request',
      json: () => Promise.resolve(mockError),
    })

    const { result } = renderHook(() => useApi())

    await act(async () => {
      await result.current.request('/api/test')
    })

    expect(result.current.data).toBeNull()
    expect(result.current.error).toBeInstanceOf(Error)
    expect(result.current.error?.message).toBe('API Error')
    expect(result.current.isLoading).toBe(false)
    expect(mockAddToast).toHaveBeenCalledWith('API Error', 'error')
  })
})
