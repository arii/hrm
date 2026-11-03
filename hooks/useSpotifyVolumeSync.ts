import { useCallback, useEffect, useReducer, useRef } from 'react'
import { clampVolume } from '@/hooks/useVolumePreference'
import type { ExecuteSpotify } from '@/hooks/useSpotifyCommand'
import { VOLUME_SYNC_GRACE_PERIOD_MS } from '@/constants/spotify'
import { resolveTargetDeviceId } from '@/lib/spotify/deviceResolution'
import type { SpotifyDevice } from '@/types/core'

/**
 * Volume/mute state machine extracted from SpotifyDisplay (#9597).
 * Owns the display volume, mute flag, slider interaction state, and the
 * grace-period sync that keeps local slider drags from jumping when
 * server broadcasts arrive mid-gesture. The server remains the source
 * of truth; this hook only mediates the local echo.
 */

interface VolumeSyncState {
  displayVolume: number
  isMuted: boolean
  isSliding: boolean
  lastVolume: number // Last non-zero volume
}

type VolumeSyncAction =
  | { type: 'SET_VOLUME'; payload: number }
  | { type: 'SET_SLIDING'; payload: boolean }
  | { type: 'TOGGLE_MUTE' }
  | {
      type: 'SYNC_WITH_WEBSOCKET'
      payload: { volume?: number; isMuted?: boolean }
    }

const volumeSyncReducer = (
  state: VolumeSyncState,
  action: VolumeSyncAction
): VolumeSyncState => {
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
        // Muting: set volume to 0
        return {
          ...state,
          isMuted: true,
          displayVolume: 0,
        }
      } else {
        // Unmuting: restore to last known volume
        return {
          ...state,
          isMuted: false,
          displayVolume: state.lastVolume > 0 ? state.lastVolume : 50, // fallback
        }
      }
    }
    default:
      return state
  }
}

interface UseSpotifyVolumeSyncParams {
  serverVolume?: number
  serverMuted?: boolean
  connectionStatus: string
  selectedDeviceId: string
  devices?: SpotifyDevice[]
  executeSpotify: ExecuteSpotify
}

export const useSpotifyVolumeSync = ({
  serverVolume,
  serverMuted,
  connectionStatus,
  selectedDeviceId,
  devices,
  executeSpotify,
}: UseSpotifyVolumeSyncParams) => {
  const [volumeState, dispatch] = useReducer(volumeSyncReducer, {
    displayVolume: serverVolume ?? 70,
    isMuted: serverMuted ?? false,
    isSliding: false,
    lastVolume: serverVolume && serverVolume > 0 ? serverVolume : 70,
  })
  const { displayVolume, isMuted } = volumeState

  // Track the last time volume command was sent to prevent sync race conditions
  const lastVolumeSendTimeRef = useRef<number>(0)
  const hasPendingSendRef = useRef<boolean>(false)

  // Synchronize with WebSocket data whenever it changes.
  // We rely on the server as the source of truth for volume, but use a grace period
  // to prevent local sliders from "jumping" while the user is actively adjusting them.
  useEffect(() => {
    const timeSinceLastSend = Date.now() - lastVolumeSendTimeRef.current

    // Only apply grace period if a send is pending and within the window.
    // The server broadcasts a SPOTIFY_UPDATE immediately after a SET_VOLUME command,
    // confirming the new state to all clients.
    const shouldRespectGracePeriod =
      hasPendingSendRef.current &&
      timeSinceLastSend < VOLUME_SYNC_GRACE_PERIOD_MS

    if (volumeState.isSliding || shouldRespectGracePeriod) {
      return
    }

    // Once grace period has elapsed, clear the pending send flag
    if (
      hasPendingSendRef.current &&
      timeSinceLastSend >= VOLUME_SYNC_GRACE_PERIOD_MS
    ) {
      hasPendingSendRef.current = false
    }

    dispatch({
      type: 'SYNC_WITH_WEBSOCKET',
      payload: {
        volume: serverVolume,
        isMuted: serverMuted,
      },
    })
  }, [serverVolume, serverMuted, volumeState.isSliding])

  // Centralized command sender for volume changes
  const sendVolumeCommand = useCallback(
    (volume: number) => {
      if (connectionStatus !== 'Connected') return
      const targetDeviceId = resolveTargetDeviceId(selectedDeviceId, devices)

      // Refinement: Only attempt to send the command if a target device is identified.
      // The VolumeSlider is already disabled in the UI if !hasActiveDevice.
      if (!targetDeviceId) return

      const sanitized = clampVolume(volume)

      lastVolumeSendTimeRef.current = Date.now()
      hasPendingSendRef.current = true

      executeSpotify('SET_VOLUME', {
        volume: sanitized,
        deviceId: targetDeviceId,
      })
    },
    [connectionStatus, selectedDeviceId, executeSpotify, devices]
  )

  // Handler for immediate UI update while sliding
  const handleVolumeChange = (newVolume: number) => {
    dispatch({ type: 'SET_VOLUME', payload: newVolume }) // Update UI immediately
  }

  // Handler for sending the final volume value after sliding stops
  const handleVolumeChangeCommitted = (newVolume: number) => {
    sendVolumeCommand(newVolume)
    dispatch({ type: 'SET_SLIDING', payload: false }) // Reset sliding state
  }

  // Handler for the VolumeSlider's mute button
  const handleToggleMute = useCallback(() => {
    // Calculate the next state to determine the command payload
    const newMutedState = !isMuted
    const newVolume = newMutedState
      ? 0
      : volumeState.lastVolume > 0
        ? volumeState.lastVolume
        : 50

    dispatch({ type: 'TOGGLE_MUTE' }) // Update UI
    sendVolumeCommand(newVolume) // Send command with the new volume
  }, [isMuted, volumeState.lastVolume, sendVolumeCommand])

  return {
    displayVolume,
    isMuted,
    handleVolumeChange,
    handleVolumeChangeCommitted,
    handleToggleMute,
  }
}
