import { useReducer, useEffect, useCallback } from 'react'
import { useOptimisticSync } from '@/hooks/useOptimisticSync'
import { SYNC_LOCK_DURATION } from '@/constants/spotify'

// 1. State Shape
interface SpotifyVolumeState {
  displayVolume: number
  isMuted: boolean
  isSliding: boolean
  lastVolume: number
}

// 2. Actions
type SpotifyVolumeAction =
  | { type: 'SET_VOLUME'; payload: number }
  | { type: 'SET_SLIDING'; payload: boolean }
  | { type: 'TOGGLE_MUTE' }
  | {
      type: 'SYNC_WITH_WEBSOCKET'
      payload: { volume?: number; isMuted?: boolean }
    }

// 3. Reducer
const spotifyVolumeReducer = (
  state: SpotifyVolumeState,
  action: SpotifyVolumeAction
): SpotifyVolumeState => {
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
        return { ...state, isMuted: true, displayVolume: 0 }
      } else {
        return {
          ...state,
          isMuted: false,
          displayVolume: state.lastVolume > 0 ? state.lastVolume : 50,
        }
      }
    }
    default:
      return state
  }
}

export const useSpotifyVolume = (
  initialVolume: number | undefined,
  initialMuted: boolean | undefined,
  sendVolumeCommand: (volume: number) => void
) => {
  const [state, dispatch] = useReducer(spotifyVolumeReducer, {
    displayVolume: initialVolume ?? 70,
    isMuted: initialMuted ?? false,
    isSliding: false,
    lastVolume: initialVolume && initialVolume > 0 ? initialVolume : 70,
  })

  const { isLocked, markInteraction } = useOptimisticSync(SYNC_LOCK_DURATION)

  useEffect(() => {
    if (state.isSliding || isLocked()) return
    dispatch({
      type: 'SYNC_WITH_WEBSOCKET',
      payload: { volume: initialVolume, isMuted: initialMuted },
    })
  }, [initialVolume, initialMuted, state.isSliding, isLocked])

  const handleVolumeChange = useCallback(
    (newVolume: number) => {
      markInteraction()
      dispatch({ type: 'SET_VOLUME', payload: newVolume })
    },
    [markInteraction]
  )

  const handleVolumeChangeCommitted = useCallback(
    (newVolume: number) => {
      markInteraction()
      sendVolumeCommand(newVolume)
      dispatch({ type: 'SET_SLIDING', payload: false })
    },
    [markInteraction, sendVolumeCommand]
  )

  const handleToggleMute = useCallback(() => {
    const newMutedState = !state.isMuted
    const newVolume = newMutedState
      ? 0
      : state.lastVolume > 0
        ? state.lastVolume
        : 50

    dispatch({ type: 'TOGGLE_MUTE' })
    sendVolumeCommand(newVolume)
  }, [state.isMuted, state.lastVolume, sendVolumeCommand])

  return {
    displayVolume: state.displayVolume,
    isMuted: state.isMuted,
    isSliding: state.isSliding,
    handleVolumeChange,
    handleVolumeChangeCommitted,
    handleToggleMute,
  }
}
