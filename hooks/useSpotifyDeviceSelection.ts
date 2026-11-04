import { useEffect, useReducer } from 'react'
import type { SpotifyDevice } from '@/types/core'

interface SpotifyDeviceState {
  selectedDeviceId: string
  deviceMenuAnchor: null | HTMLElement
}

type SpotifyDeviceAction =
  | { type: 'SELECT_DEVICE'; payload: string }
  | { type: 'OPEN_DEVICE_MENU'; payload: HTMLElement }
  | { type: 'CLOSE_DEVICE_MENU' }

const spotifyDeviceReducer = (
  state: SpotifyDeviceState,
  action: SpotifyDeviceAction
): SpotifyDeviceState => {
  switch (action.type) {
    case 'SELECT_DEVICE':
      return {
        ...state,
        selectedDeviceId: action.payload,
        deviceMenuAnchor: null,
      }
    case 'OPEN_DEVICE_MENU':
      return { ...state, deviceMenuAnchor: action.payload }
    case 'CLOSE_DEVICE_MENU':
      return { ...state, deviceMenuAnchor: null }
    default:
      return state
  }
}

/** Sync decision for the selected device. Pure values. */
type SelectedDeviceSync =
  | { kind: 'select'; deviceId: string }
  | { kind: 'none' }

/**
 * Pure selection-sync policy: clears when the list empties,
 * auto-selects the active device, and re-resolves when the selection
 * vanishes. Unit-tested.
 */
export const resolveSelectedDeviceSync = (
  devices: SpotifyDevice[] | null | undefined,
  selectedDeviceId: string
): SelectedDeviceSync => {
  const list = devices || []
  if (list.length === 0) {
    return selectedDeviceId !== ''
      ? { kind: 'select', deviceId: '' }
      : { kind: 'none' }
  }
  const activeDevice = list.find((device) => device.is_active)
  if (!selectedDeviceId) {
    return activeDevice
      ? { kind: 'select', deviceId: activeDevice.id }
      : { kind: 'none' }
  }
  if (!list.some((device) => device.id === selectedDeviceId)) {
    return { kind: 'select', deviceId: activeDevice?.id ?? '' }
  }
  return { kind: 'none' }
}

/**
 * Device selection state with server-list sync: auto-selects the active
 * device, clears when the list empties, and re-resolves when the
 * selected device vanishes. Menu anchor state rides along. Extracted
 * verbatim from SpotifyDisplay; covered by its component tests.
 */
export const useSpotifyDeviceSelection = (
  devices: SpotifyDevice[] | null | undefined
) => {
  const [deviceState, deviceDispatch] = useReducer(spotifyDeviceReducer, {
    selectedDeviceId: '',
    deviceMenuAnchor: null,
  })
  const { selectedDeviceId, deviceMenuAnchor } = deviceState

  // Effect to auto-select the active device
  useEffect(() => {
    const action = resolveSelectedDeviceSync(devices, selectedDeviceId)
    if (action.kind === 'select') {
      deviceDispatch({ type: 'SELECT_DEVICE', payload: action.deviceId })
    }
  }, [devices, selectedDeviceId])

  return { selectedDeviceId, deviceMenuAnchor, deviceDispatch }
}
