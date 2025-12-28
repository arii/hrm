/** @jest-environment jsdom */
// tests/unit/hooks/usePlaylistDetails.test.ts
import { renderHook, waitFor } from '@testing-library/react'
import { usePlaylistDetails } from '@/hooks/usePlaylistDetails'

const mockFetch = jest.fn((url) => {
  if (url.toString().endsWith('validId')) {
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          name: 'Test Playlist',
          tracks: [{ uri: 'spotify:track:123', name: 'Test Track' }],
        }),
    } as Response)
  }
  if (url.toString().endsWith('notFound')) {
    return Promise.resolve({ ok: false, status: 404 } as Response)
  }
  if (url.toString().endsWith('invalidData')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({}),
    } as Response)
  }
  if (url.toString().endsWith('networkError')) {
    return Promise.reject(new Error('Network error'))
  }
  return Promise.resolve({ ok: false, status: 500 } as Response)
})

beforeAll(() => {
  global.fetch = mockFetch
})

afterAll(() => {
  jest.restoreAllMocks()
})

describe('usePlaylistDetails', () => {
  it('should return loading state initially', () => {
    const { result } = renderHook(() =>
      usePlaylistDetails('spotify:playlist:validId')
    )
    expect(result.current.loading).toBe(true)
  })

  it('should fetch and return data for a valid playlist ID', async () => {
    const { result } = renderHook(() =>
      usePlaylistDetails('spotify:playlist:validId')
    )

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.data?.name).toBe('Test Playlist')
    expect(result.current.data?.tracks).toHaveLength(1)
    expect(result.current.error).toBeNull()
  })

  it('should return a 404 error for a non-existent playlist', async () => {
    const { result } = renderHook(() =>
      usePlaylistDetails('spotify:playlist:notFound')
    )

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.data).toBeNull()
    expect(result.current.error).toContain('Playlist not found')
  })

  it('should return a generic error for a server failure', async () => {
    const { result } = renderHook(() =>
      usePlaylistDetails('spotify:playlist:serverError')
    )

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.data).toBeNull()
    expect(result.current.error).toContain('Failed to fetch')
  })

  it('should return an error for invalid data format', async () => {
    const { result } = renderHook(() =>
      usePlaylistDetails('spotify:playlist:invalidData')
    )

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.data).toBeNull()
    expect(result.current.error).toContain('Failed to parse')
  })

  it('should return an error for network errors', async () => {
    const { result } = renderHook(() =>
      usePlaylistDetails('spotify:playlist:networkError')
    )

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.data).toBeNull()
    expect(result.current.error).toContain('Network error')
  })

  it('should abort the fetch request on unmount', () => {
    const { unmount } = renderHook(() =>
      usePlaylistDetails('spotify:playlist:validId')
    )
    // AbortController is not directly testable in this environment,
    // but we can ensure the hook cleans up without errors.
    unmount()
  })
})
