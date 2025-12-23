/** @jest-environment jsdom */
import { renderHook, act } from '@testing-library/react'
import useSpotifyDevices from '@/hooks/useSpotifyDevices'
import { SpotifyDevice } from '@/types/core'

const mockDevices: SpotifyDevice[] = [
  {
    id: '1',
    is_active: true,
    is_private_session: false,
    is_restricted: false,
    name: 'Device 1',
    type: 'computer',
    volume_percent: 50,
  },
]

global.fetch = jest.fn()

describe('useSpotifyDevices', () => {
  beforeEach(() => {
    ;(fetch as jest.Mock).mockClear()
  })

  it('should fetch devices and set loading to false', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockDevices,
    })
    const { result } = renderHook(() => useSpotifyDevices())

    expect(result.current.loading).toBe(true)

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.devices).toEqual(mockDevices)
    expect(result.current.error).toBe(null)
  })

  it('should handle fetch error', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('API Error'))
    const { result } = renderHook(() => useSpotifyDevices())

    expect(result.current.loading).toBe(true)

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.devices).toEqual([])
    expect(result.current.error).toBe('API Error')
  })

  it('should refresh devices when refreshDevices is called', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    })
    const { result } = renderHook(() => useSpotifyDevices())

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    expect(result.current.devices).toEqual([])
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockDevices,
    })

    await act(async () => {
      result.current.refreshDevices()
    })

    expect(result.current.devices).toEqual(mockDevices)
  })
})
