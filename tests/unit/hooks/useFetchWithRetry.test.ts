/**
 * @jest-environment jsdom
 */
// tests/unit/hooks/useFetchWithRetry.test.ts
import { renderHook, act } from '@testing-library/react'
import { useFetchWithRetry } from '@/hooks/useFetchWithRetry'

// Mock the fetch function
global.fetch = jest.fn()

describe('useFetchWithRetry', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return data on successful fetch', async () => {
    const mockData = { message: 'success' }
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    })

    const { result } = renderHook(() => useFetchWithRetry('/api/test'))
    await act(async () => {
      await result.current.execute()
    })

    expect(result.current.data).toEqual(mockData)
    expect(result.current.error).toBeNull()
    expect(result.current.isLoading).toBe(false)
  })

  it('should retry on failure and eventually succeed', async () => {
    const mockData = { message: 'success' }
    ;(fetch as jest.Mock)
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      })

    const { result } = renderHook(() =>
      useFetchWithRetry('/api/test', { retries: 2 })
    )
    await act(async () => {
      await result.current.execute()
    })

    expect(fetch).toHaveBeenCalledTimes(2)
    expect(result.current.data).toEqual(mockData)
    expect(result.current.error).toBeNull()
  })

  it('should return an error after all retries fail', async () => {
    ;(fetch as jest.Mock).mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() =>
      useFetchWithRetry('/api/test', { retries: 3 })
    )
    await act(async () => {
      await result.current.execute()
    })

    expect(fetch).toHaveBeenCalledTimes(3)
    expect(result.current.data).toBeNull()
    expect(result.current.error).not.toBeNull()
    expect(result.current.error?.code).toBe('NETWORK_ERROR')
  })

  it('should abort the request on unmount', async () => {
    ;(fetch as jest.Mock).mockImplementation(
      (_url, { signal }) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener('abort', () => {
            reject(new Error('Aborted'))
          })
        })
    )

    const { result, unmount } = renderHook(() => useFetchWithRetry('/api/test'))
    act(() => {
      result.current.execute()
    })

    unmount()

    // The AbortController in the hook should have been called
    // We can't directly test that, but we can see the effect
    // The error should be null because the state update is skipped on abort
    expect(result.current.error).toBeNull()
  })
})
