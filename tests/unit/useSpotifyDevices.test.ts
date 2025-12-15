/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react'
import { useSpotifyDevices } from '@/hooks/useSpotifyDevices'
import { SpotifyDevice } from '@/types'

// Mock fetch
global.fetch = jest.fn()

const mockDevices: SpotifyDevice[] = [
  {
    id: '1',
    is_active: true,
    name: 'Device 1',
    type: 'Computer',
    is_private_session: false,
    is_restricted: false,
    volume_percent: 50,
  },
  {
    id: '2',
    is_active: false,
    name: 'Device 2',
    type: 'Speaker',
    is_private_session: false,
    is_restricted: false,
    volume_percent: 100,
  },
]

describe('useSpotifyDevices', () => {
  beforeEach(() => {
    ;(fetch as jest.Mock).mockClear()
  })

  it('should fetch devices and set them', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockDevices,
    })

    const { result } = renderHook(() => useSpotifyDevices())

    expect(result.current.isLoading).toBe(true)

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0)) // Wait for state update
    })

    expect(result.current.isLoading).toBe(false)
    expect(result.current.devices).toEqual(mockDevices)
    expect(result.current.error).toBeNull()
  })

  it('should handle fetch devices error', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
    })

    const { result } = renderHook(() => useSpotifyDevices())

    expect(result.current.isLoading).toBe(true)

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    expect(result.current.isLoading).toBe(false)
    expect(result.current.devices).toEqual([])
    expect(result.current.error).toEqual(new Error('Failed to fetch devices'))
  })

  it('should transfer playback and update active device', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockDevices,
      })
      .mockResolvedValueOnce({
        ok: true, // For transfer playback
      })
      .mockResolvedValueOnce({
        ok: true, // For refetch
        json: async () =>
          mockDevices.map((d) => ({ ...d, is_active: d.id === '2' })),
      })

    const { result } = renderHook(() => useSpotifyDevices())

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0)) // Initial fetch
    })

    await act(async () => {
      result.current.transferPlayback('2')
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    const expectedDevices = mockDevices.map((d) => ({
      ...d,
      is_active: d.id === '2',
    }))

    expect(result.current.devices).toEqual(expectedDevices)
  })

  it('should handle transfer playback error', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockDevices,
      })
      .mockResolvedValueOnce({
        ok: false, // For transfer playback
      })

    const { result } = renderHook(() => useSpotifyDevices())

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    await act(async () => {
      result.current.transferPlayback('2')
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    expect(result.current.error).toEqual(
      new Error('Failed to transfer playback')
    )
  })
})
