/**
 * @jest-environment jsdom
 */
// File: tests/unit/hooks/useSpotifySearch.test.ts
import { renderHook, act } from '@testing-library/react'
import { useSpotifySearch } from '@/hooks/useSpotifySearch'
import { Track } from '@spotify/web-api-ts-sdk'

// Mock fetch
global.fetch = jest.fn()

const mockFetch = global.fetch as jest.Mock

describe('useSpotifySearch', () => {
  beforeEach(() => {
    mockFetch.mockClear()
  })

  it('should return initial state', () => {
    const { result } = renderHook(() => useSpotifySearch())
    expect(result.current.results).toEqual([])
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('should not fetch when query is empty', async () => {
    const { result } = renderHook(() => useSpotifySearch())
    await act(async () => {
      result.current.searchTracks('')
    })
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('should fetch and set results on successful search', async () => {
    const mockTracks: Track[] = [{ id: '1', name: 'Test Track', uri: 'spotify:track:1' } as Track]
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockTracks,
    })

    const { result } = renderHook(() => useSpotifySearch())

    await act(async () => {
      await result.current.searchTracks('test')
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.results).toEqual(mockTracks)
    expect(result.current.error).toBeNull()
  })

  it('should set error state on failed search', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Test Error' }),
    })

    const { result } = renderHook(() => useSpotifySearch())

    await act(async () => {
      await result.current.searchTracks('test')
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.results).toEqual([])
    expect(result.current.error).toBe('Test Error')
  })

  it('should clear search results', async () => {
    const mockTracks: Track[] = [{ id: '1', name: 'Test Track', uri: 'spotify:track:1' } as Track]
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockTracks,
    })

    const { result } = renderHook(() => useSpotifySearch())

    await act(async () => {
      await result.current.searchTracks('test')
    })

    expect(result.current.results).toEqual(mockTracks)

    act(() => {
      result.current.clearSearch()
    })

    expect(result.current.results).toEqual([])
  })
})
