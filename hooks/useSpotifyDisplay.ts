// hooks/useSpotifyDisplay.ts
import { useReducer, useCallback, useEffect, useRef, useState } from 'react'
import { SpotifyData } from '@/types/websocket'
import { clampVolume } from '@/hooks/useVolumePreference'
import { SpotifyCommandMessage } from '@/types/websocket'
import { signOut } from 'next-auth/react'
import { useError } from '@/context/ErrorContext'
import { Session } from 'next-auth'

// 1. State Shape
interface SpotifyDisplayState {
  displayVolume: number
  isMuted: boolean
  lastVolume: number // Last non-zero volume
  selectedDeviceId: string
  deviceMenuAnchor: null | HTMLElement
}

// 2. Actions
type SpotifyDisplayAction =
  | { type: 'SET_VOLUME'; payload: number }
  | { type: 'TOGGLE_MUTE' }
  | { type: 'SELECT_DEVICE'; payload: string }
  | { type: 'OPEN_DEVICE_MENU'; payload: HTMLElement }
  | { type: 'CLOSE_DEVICE_MENU' }
  | {
      type: 'SYNC_WITH_WEBSOCKET'
      payload: { volume?: number; isMuted?: boolean }
    }

// 3. Initial State Factory
const initialStateFactory = (
  volume: number | undefined,
  isMuted: boolean
): SpotifyDisplayState => ({
  displayVolume: volume ?? 70,
  isMuted: isMuted,
  lastVolume: volume && volume > 0 ? volume : 70, // Store last non-zero volume
  selectedDeviceId: '',
  deviceMenuAnchor: null,
})

// 4. Reducer Logic
const spotifyDisplayReducer = (
  state: SpotifyDisplayState,
  action: SpotifyDisplayAction
): SpotifyDisplayState => {
  switch (action.type) {
    case 'SYNC_WITH_WEBSOCKET': {
      const { volume, isMuted } = action.payload
      const newVolume = volume ?? state.displayVolume
      return {
        ...state,
        displayVolume: newVolume,
        isMuted: isMuted ?? state.isMuted,
        lastVolume: newVolume > 0 ? newVolume : state.lastVolume,
      }
    }
    case 'SET_VOLUME':
      return {
        ...state,
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

interface UseSpotifyDisplayProps {
  spotifyData: SpotifyData
  sendData: (data: SpotifyCommandMessage) => void
  connectionStatus: string
  session: Session | null
}

export const useSpotifyDisplay = ({
  spotifyData,
  sendData,
  connectionStatus,
  session,
}: UseSpotifyDisplayProps) => {
  const { addError } = useError()
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [isSliding, setIsSliding] = useState(false)

  const [state, dispatch] = useReducer(
    spotifyDisplayReducer,
    initialStateFactory(spotifyData.volume, spotifyData.isMuted ?? false)
  )
  const { displayVolume, isMuted, selectedDeviceId, deviceMenuAnchor } = state

  useEffect(() => {
    if (session?.error === 'RefreshAccessTokenError') {
      addError('Spotify session expired. Please log in again.', 'persistent')
      signOut()
    }
  }, [session, addError])

  useEffect(() => {
    if (isSliding) return
    dispatch({
      type: 'SYNC_WITH_WEBSOCKET',
      payload: { volume: spotifyData.volume, isMuted: spotifyData.isMuted },
    })
  }, [spotifyData.volume, spotifyData.isMuted, isSliding])

  const sendVolumeCommand = useCallback(
    (volume: number) => {
      if (connectionStatus !== 'Connected') return
      const targetDeviceId =
        selectedDeviceId ||
        spotifyData.devices?.find((device) => device.is_active)?.id
      if (!targetDeviceId) {
        console.warn(
          '[SpotifyDisplay] No target device for volume command. Aborting.'
        )
        return
      }
      const sanitized = clampVolume(volume)
      const message: SpotifyCommandMessage = {
        type: 'SPOTIFY_COMMAND',
        command: 'SET_VOLUME',
        volume: sanitized,
        deviceId: targetDeviceId,
      }
      sendData(message)
    },
    [connectionStatus, selectedDeviceId, sendData, spotifyData.devices]
  )

  const handleVolumeChange = (newVolume: number) => {
    setIsSliding(true)
    dispatch({ type: 'SET_VOLUME', payload: newVolume })

    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }
    debounceTimeoutRef.current = setTimeout(() => {
      sendVolumeCommand(newVolume)
      setIsSliding(false)
    }, 300)
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

  const sendSpotifyCommand = useCallback(
    (
      command: 'PLAY' | 'PAUSE' | 'NEXT' | 'PREVIOUS' | 'TRANSFER_PLAYBACK',
      targetDeviceId?: string
    ) => {
      const message: SpotifyCommandMessage = {
        type: 'SPOTIFY_COMMAND',
        command,
        ...(targetDeviceId && { deviceId: targetDeviceId }),
      }
      sendData(message)
    },
    [sendData]
  )

  const handlePlayPauseToggle = useCallback(() => {
    const command = spotifyData.isPlaying ? 'PAUSE' : 'PLAY'
    sendSpotifyCommand(command)
  }, [spotifyData.isPlaying, sendSpotifyCommand])

  const handleDeviceSelect = (deviceId: string) => {
    dispatch({ type: 'SELECT_DEVICE', payload: deviceId })
    sendSpotifyCommand('TRANSFER_PLAYBACK', deviceId)
  }

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    dispatch({ type: 'OPEN_DEVICE_MENU', payload: event.currentTarget })
  }

  const handleMenuClose = () => {
    dispatch({ type: 'CLOSE_DEVICE_MENU' })
  }

  const handleLogout = async () => {
    await signOut({ redirect: false })
    window.location.reload()
  }

  return {
    state: {
      displayVolume,
      isMuted,
      deviceMenuAnchor,
    },
    handlers: {
      handleVolumeChange,
      handleToggleMute,
      handleDeviceSelect,
      handlePlayPauseToggle,
      sendSpotifyCommand,
      handleMenuOpen,
      handleMenuClose,
      handleLogout,
    },
  }
}
