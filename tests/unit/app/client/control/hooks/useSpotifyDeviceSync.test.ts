/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react'
import { useSpotifyDeviceSync } from '@/app/client/control/hooks/useSpotifyDeviceSync'
import { createMockSpotifyDevice } from '@/tests/test-utils'

describe('useSpotifyDeviceSync', () => {
  it('initializes with empty selectedDeviceId', () => {
    const { result } = renderHook(() => useSpotifyDeviceSync([]))
    expect(result.current.selectedDeviceId).toBe('')
  })

  it('syncs with active device on mount', () => {
    const devices = [
      createMockSpotifyDevice({ id: '1', name: 'Dev 1', is_active: true }),
    ]
    const { result } = renderHook(() => useSpotifyDeviceSync(devices))
    expect(result.current.selectedDeviceId).toBe('1')
  })

  it('syncs when active device changes externally', () => {
    const initialDevices = [
      createMockSpotifyDevice({ id: '1', name: 'Dev 1', is_active: true }),
    ]
    const { result, rerender } = renderHook(
      ({ devices }) => useSpotifyDeviceSync(devices),
      {
        initialProps: { devices: initialDevices },
      }
    )

    const updatedDevices = [
      createMockSpotifyDevice({ id: '1', name: 'Dev 1', is_active: false }),
      createMockSpotifyDevice({ id: '2', name: 'Dev 2', is_active: true }),
    ]
    rerender({ devices: updatedDevices })

    expect(result.current.selectedDeviceId).toBe('2')
  })

  it('falls back to HRM Web Player if no device is active', () => {
    const hrmDevice = createMockSpotifyDevice({
      id: 'hrm',
      name: 'HRM Web Player',
    })
    const devices = [
      createMockSpotifyDevice({ id: '1', name: 'Dev 1', is_active: false }),
      hrmDevice,
    ]
    const { result } = renderHook(() =>
      useSpotifyDeviceSync(devices, hrmDevice)
    )
    expect(result.current.selectedDeviceId).toBe('hrm')
  })

  it('allows manual override of selectedDeviceId', () => {
    const devices = [
      createMockSpotifyDevice({ id: '1', name: 'Dev 1', is_active: true }),
      createMockSpotifyDevice({ id: '2', name: 'Dev 2', is_active: false }),
    ]
    const { result } = renderHook(() => useSpotifyDeviceSync(devices))

    act(() => {
      result.current.setSelectedDeviceId('2')
    })

    expect(result.current.selectedDeviceId).toBe('2')
  })
})
