/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react'
import { usePlaylistTracks } from '@/hooks/usePlaylistTracks'
import { SpotifyPlaylistItem as Track } from '@/types/core'

// Mock fetch
global.fetch = jest.fn()

describe('hooks/usePlaylistTracks', () => {
  const mockTracks: Track[] = [
    {
      id: '1',
      name: 'Track 1',
      uri: 'spotify:track:1',
      duration_ms: 180000,
      artists: [{ name: 'Artist 1' }],
      album: { name: 'Album 1', images: [] },
    },
    {
      id: '2',
      name: 'Track 2',
      uri: 'spotify:track:2',
      duration_ms: 240000,
      artists: [{ name: 'Artist 2' }],
      album: { name: 'Album 2', images: [] },
    },
  ]

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should fetch tracks and update state', async () => {
    const mockResponse = {
      tracks: mockTracks,
      total: 2,
    }
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    })

    const { result } = renderHook(() => usePlaylistTracks('playlist-123'))

    await act(async () => {
      await result.current.fetchTracks(0)
    })

    expect(result.current.tracks).toEqual(mockTracks)
    expect(result.current.total).toBe(2)
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('should handle append mode for infinite scroll', async () => {
    const initialTracks = [mockTracks[0]]
    const moreTracks = [mockTracks[1]]

    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tracks: initialTracks, total: 2 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tracks: moreTracks, total: 2 }),
      })

    const { result } = renderHook(() =>
      usePlaylistTracks('playlist-123', { mode: 'append', limit: 1 })
    )

    await act(async () => {
      await result.current.fetchTracks(0)
    })

    expect(result.current.tracks).toEqual(initialTracks)

    await act(async () => {
      await result.current.fetchTracks(1)
    })

    expect(result.current.tracks).toEqual([...initialTracks, ...moreTracks])
  })

  it('should handle API errors', async () => {
    const errorMessage = 'Spotify API Error'
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({ message: errorMessage }),
    })

    const { result } = renderHook(() => usePlaylistTracks('playlist-123'))

    await act(async () => {
      await result.current.fetchTracks(0)
    })

    expect(result.current.error).toBe(errorMessage)
    expect(result.current.loading).toBe(false)
  })

  it('should handle network errors or malformed JSON', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => {
        throw new Error('Malformed JSON')
      },
    })

    const { result } = renderHook(() => usePlaylistTracks('playlist-123'))

    await act(async () => {
      await result.current.fetchTracks(0)
    })

    expect(result.current.error).toBe('Failed to fetch tracks')
    expect(result.current.loading).toBe(false)
  })

  it('should update hasMore based on limit', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ tracks: mockTracks, total: 10 }),
    })

    const { result } = renderHook(() =>
      usePlaylistTracks('playlist-123', { limit: 2 })
    )

    await act(async () => {
      await result.current.fetchTracks(0)
    })

    expect(result.current.hasMore).toBe(true)

    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ tracks: [mockTracks[0]], total: 10 }),
    })

    await act(async () => {
      await result.current.fetchTracks(2)
    })

    expect(result.current.hasMore).toBe(false)
  })
})
