import { VOLUME_SYNC_GRACE_PERIOD_MS } from '@/constants/spotify'
import { clampVolume } from '@/hooks/useVolumePreference'
import { SpotifyCommand, SpotifyCommandParameters } from '@/types/core'
import { SpotifyData } from '@/types/websocket'
import { useCallback, useEffect, useReducer, useRef } from 'react'

interface UseSpotifyDeviceSyncState {
  displayVolume: number
  isMuted: boolean
  isSliding: boolean
  lastVolume: number
  selectedDeviceId: string
}

type UseSpotifyDeviceSyncAction =
  | { type: 'SET_VOLUME'; payload: number }
  | { type: 'SET_SLIDING'; payload: boolean }
  | { type: 'TOGGLE_MUTE' }
  | { type: 'SELECT_DEVICE'; payload: string }
  | {
      type: 'SYNC_WITH_WEBSOCKET'
      payload: { volume?: number; isMuted?: boolean }
    }

const spotifyDeviceSyncReducer = (
  state: UseSpotifyDeviceSyncState,
  action: UseSpotifyDeviceSyncAction
): UseSpotifyDeviceSyncState => {
  switch (action.type) {
    case 'SYNC_WITH_WEBSOCKET': {
      if (state.isSliding) return state
      const { volume, isMuted } = action.payload
      const newVolume = volume ?? state.displayVolume
      return {
        ...state,
        displayVolume: newVolume,
        isMuted: isMuted ?? state.isMuted,
        lastVolume: newVolume > 0 ? newVolume : state.lastVolume,
      }
    }
    case 'SET_SLIDING':
      return { ...state, isSliding: action.payload }
    case 'SET_VOLUME':
      return {
        ...state,
        isSliding: true,
        displayVolume: action.payload,
        isMuted: action.payload === 0,
        lastVolume: action.payload > 0 ? action.payload : state.lastVolume,
      }
    case 'TOGGLE_MUTE': {
      const newMutedState = !state.isMuted
      if (newMutedState) {
        return {
          ...state,
          isMuted: true,
          displayVolume: 0,
        }
      } else {
        return {
          ...state,
          isMuted: false,
          displayVolume: state.lastVolume > 0 ? state.lastVolume : 50,
        }
      }
    }
    case 'SELECT_DEVICE':
      return {
        ...state,
        selectedDeviceId: action.payload,
      }
    default:
      return state
  }
}

export const useSpotifyDeviceSync = (
  spotifyData: SpotifyData,
  executeSpotify: (
    command: SpotifyCommand,
    payload?: SpotifyCommandParameters
  ) => void,
  connectionStatus: string
) => {
  const [state, dispatch] = useReducer(spotifyDeviceSyncReducer, {
    displayVolume: spotifyData.playback.volume_percent ?? 70,
    isMuted: spotifyData.playback.isMuted ?? false,
    isSliding: false,
    lastVolume:
      spotifyData.playback.volume_percent &&
      spotifyData.playback.volume_percent > 0
        ? spotifyData.playback.volume_percent
        : 70,
    selectedDeviceId: '',
  })

  const { displayVolume, isMuted, selectedDeviceId } = state
  const lastVolumeSendTimeRef = useRef<number>(0)
  const hasPendingSendRef = useRef<boolean>(false)

  // Sync with WebSocket data
  useEffect(() => {
    const timeSinceLastSend = Date.now() - lastVolumeSendTimeRef.current
    const shouldRespectGracePeriod =
      hasPendingSendRef.current &&
      timeSinceLastSend < VOLUME_SYNC_GRACE_PERIOD_MS

    if (state.isSliding || shouldRespectGracePeriod) {
      return
    }

    if (
      hasPendingSendRef.current &&
      timeSinceLastSend >= VOLUME_SYNC_GRACE_PERIOD_MS
    ) {
      hasPendingSendRef.current = false
    }

    dispatch({
      type: 'SYNC_WITH_WEBSOCKET',
      payload: {
        volume: spotifyData.playback.volume_percent,
        isMuted: spotifyData.playback.isMuted,
      },
    })
  }, [
    spotifyData.playback.volume_percent,
    spotifyData.playback.isMuted,
    state.isSliding,
  ])

  // Centralized command sender
  const sendVolumeCommand = useCallback(
    (volume: number) => {
      if (connectionStatus !== 'Connected') return
      const targetDeviceId =
        selectedDeviceId ||
        spotifyData.devices?.find((device) => device.is_active)?.id

      if (!targetDeviceId) return

      const sanitized = clampVolume(volume)

      lastVolumeSendTimeRef.current = Date.now()
      hasPendingSendRef.current = true

      executeSpotify('SET_VOLUME', {
        volume: sanitized,
        deviceId: targetDeviceId,
      })
    },
    [connectionStatus, selectedDeviceId, executeSpotify, spotifyData.devices]
  )

  const handleVolumeChange = (newVolume: number) => {
    dispatch({ type: 'SET_VOLUME', payload: newVolume })
  }

  const handleVolumeChangeCommitted = (newVolume: number) => {
    sendVolumeCommand(newVolume)
    dispatch({ type: 'SET_SLIDING', payload: false })
  }

  const handleToggleMute = useCallback(() => {
    const newMutedState = !isMuted
    const newVolume = newMutedState
      ? 0
      : state.lastVolume > 0
        ? state.lastVolume
        : 50

    dispatch({ type: 'TOGGLE_MUTE' })
    sendVolumeCommand(newVolume)
  }, [isMuted, state.lastVolume, sendVolumeCommand])

  // Auto-select active device
  useEffect(() => {
    const devices = spotifyData.devices || []
    if (devices.length === 0) {
      if (selectedDeviceId !== '') {
        dispatch({ type: 'SELECT_DEVICE', payload: '' })
      }
      return
    }
    const activeDevice = devices.find((device) => device.is_active)
    if (!selectedDeviceId && activeDevice) {
      dispatch({ type: 'SELECT_DEVICE', payload: activeDevice.id })
      return
    }
    if (
      selectedDeviceId &&
      !devices.some((device) => device.id === selectedDeviceId)
    ) {
      dispatch({ type: 'SELECT_DEVICE', payload: activeDevice?.id ?? '' })
    }
  }, [spotifyData.devices, selectedDeviceId])

  const handleDeviceSelect = (deviceId: string) => {
    dispatch({ type: 'SELECT_DEVICE', payload: deviceId })
    executeSpotify('TRANSFER_PLAYBACK', { deviceId })
  }

  return {
    displayVolume,
    isMuted,
    selectedDeviceId,
    handleVolumeChange,
    handleVolumeChangeCommitted,
    handleToggleMute,
    handleDeviceSelect,
  }
}
