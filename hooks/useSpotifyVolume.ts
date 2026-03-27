import { useReducer, useEffect, useCallback } from 'react'
import { useWebSocket } from '@/context/WebSocketContext'
import { SYNC_LOCK_DURATION } from '@/constants/spotify'

interface SpotifyVolumeState {
  displayVolume: number
  isSliding: boolean
  lastVolume: number
  lastActionTime: number
}

type SpotifyVolumeAction =
  | { type: 'SET_VOLUME'; payload: number; timestamp: number }
  | { type: 'SET_SLIDING'; payload: boolean }
  | { type: 'TOGGLE_MUTE'; timestamp: number }
  | {
      type: 'SYNC_WITH_WEBSOCKET'
      payload: { volume?: number }
      timestamp: number
    }
  | { type: 'UNLOCK' }

const spotifyVolumeReducer = (
  state: SpotifyVolumeState,
  action: SpotifyVolumeAction
): SpotifyVolumeState => {
  switch (action.type) {
    case 'SYNC_WITH_WEBSOCKET': {
      if (
        state.isSliding ||
        action.timestamp - state.lastActionTime < SYNC_LOCK_DURATION
      ) {
        return state
      }
      const newVolume = action.payload.volume ?? state.displayVolume
      return {
        ...state,
        displayVolume: newVolume,
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
        lastVolume: action.payload > 0 ? action.payload : state.lastVolume,
        lastActionTime: action.timestamp,
      }
    case 'TOGGLE_MUTE': {
      const newMutedState = state.displayVolume !== 0
      if (newMutedState) {
        return { ...state, displayVolume: 0, lastActionTime: action.timestamp }
      } else {
        return {
          ...state,
          displayVolume: state.lastVolume > 0 ? state.lastVolume : 50,
          lastActionTime: action.timestamp,
        }
      }
    }
    case 'UNLOCK':
      return { ...state, lastActionTime: 0 }
    default:
      return state
  }
}

export const useSpotifyVolume = (
  initialVolume: number | undefined,

  sendVolumeCommand: (volume: number) => void
) => {
  const { onEvent } = useWebSocket()
  const [state, dispatch] = useReducer(spotifyVolumeReducer, {
    displayVolume: initialVolume ?? 70,
    isSliding: false,
    lastVolume: initialVolume && initialVolume > 0 ? initialVolume : 70,
    lastActionTime: 0,
  })

  useEffect(() => {
    dispatch({
      type: 'SYNC_WITH_WEBSOCKET',
      payload: { volume: initialVolume },
      timestamp: Date.now(),
    })
  }, [initialVolume])

  const handleVolumeChange = useCallback((newVolume: number) => {
    dispatch({ type: 'SET_VOLUME', payload: newVolume, timestamp: Date.now() })
  }, [])

  const handleVolumeChangeCommitted = useCallback(
    (newVolume: number) => {
      sendVolumeCommand(newVolume)
      dispatch({ type: 'SET_SLIDING', payload: false })
    },
    [sendVolumeCommand]
  )

  const handleToggleMute = useCallback(() => {
    const isCurrentlyMuted = state.displayVolume === 0
    const newVolume = isCurrentlyMuted
      ? state.lastVolume > 0
        ? state.lastVolume
        : 50
      : 0

    dispatch({ type: 'TOGGLE_MUTE', timestamp: Date.now() })
    sendVolumeCommand(newVolume)
  }, [state.displayVolume, state.lastVolume, sendVolumeCommand])

  useEffect(() => {
    if (!onEvent) return
    return onEvent('SPOTIFY_OPTIMISTIC_FAILURE', (data: unknown) => {
      if ((data as { command: string })?.command === 'SET_VOLUME') {
        dispatch({ type: 'UNLOCK' })
      }
    })
  }, [onEvent])

  return {
    displayVolume: state.displayVolume,
    isMuted: state.displayVolume === 0,
    isSliding: state.isSliding,
    handleVolumeChange,
    handleVolumeChangeCommitted,
    handleToggleMute,
  }
}
