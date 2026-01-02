// File: hooks/useSpotifyControls.ts
'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useWebSocket } from '@/context/WebSocketContext'
import { SpotifyCommand, SpotifyCommandMessage } from '@/types/websocket'
import useVolumePreference, { clampVolume } from './useVolumePreference'
import { Device } from '@spotify/web-api-ts-sdk'

/**
 * @interface UseSpotifyControlsReturn
 * @description The return type of the `useSpotifyControls` hook.
 * @property {string} selectedDeviceId - The ID of the currently selected device.
 * @property {Function} setSelectedDeviceId - Function to set the selected device ID.
 * @property {Device[]} devices - An array of available Spotify devices.
 * @property {number} volume - The current volume level.
 * @property {Function} setVolume - Function to set the volume level.
 * @property {boolean} muted - Whether the volume is muted.
 * @property {Function} toggleMute - Function to toggle mute.
 * @property {Function} sendSpotifyCommand - Function to send a command to the Spotify API.
 * @property {Function} handleTrackSelect - Function to handle selecting a track.
 * @property {Function} handlePlaybackCommand - Function to handle playback commands.
 */
export interface UseSpotifyControlsReturn {
  selectedDeviceId: string
  setSelectedDeviceId: React.Dispatch<React.SetStateAction<string>>
  devices: Device[]
  volume: number
  setVolume: (volume: number) => void
  muted: boolean
  toggleMute: () => void
  sendSpotifyCommand: (
    command: SpotifyCommand,
    overriddenDeviceId?: string
  ) => void
  handleTrackSelect: (uri: string) => void
  handlePlaybackCommand: (command: SpotifyCommand) => void
}

/**
 * Custom hook to manage Spotify controls, including device selection, volume, and playback commands.
 * This hook centralizes the logic for interacting with the Spotify API via WebSockets.
 *
 * @returns {UseSpotifyControlsReturn} An object containing state and functions for controlling Spotify.
 */
const useSpotifyControls = (): UseSpotifyControlsReturn => {
  const { spotifyData, connectionStatus, sendData, spotifyServiceInitialized } =
    useWebSocket()
  const { devices = [] } = spotifyData
  const { volume, setVolume, muted, toggleMute } = useVolumePreference()
  const lastSentVolumeRef = useRef<string | null>(null)
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('')
  const prevActiveIdRef = useRef<string | undefined>(undefined)

  useEffect(() => {
    if (connectionStatus === 'Connected' && spotifyServiceInitialized) {
      sendData({
        type: 'SPOTIFY_COMMAND',
        command: 'GET_DEVICES',
      })
    }
  }, [connectionStatus, sendData, spotifyServiceInitialized])

  useEffect(() => {
    const activeDevice = devices.find((d) => d.is_active)
    const activeId = activeDevice?.id

    setSelectedDeviceId((currentSelectedId) => {
      let nextSelectedId = currentSelectedId
      const selectedDeviceExists = devices.some(
        (d) => d.id === currentSelectedId
      )

      if (prevActiveIdRef.current === undefined && activeId) {
        nextSelectedId = activeId
      } else if (activeId && activeId !== prevActiveIdRef.current) {
        nextSelectedId = activeId
      } else {
        if (currentSelectedId && !selectedDeviceExists) {
          nextSelectedId = activeId ?? ''
        } else if (!currentSelectedId && activeId) {
          nextSelectedId = activeId
        }
      }
      return nextSelectedId
    })

    prevActiveIdRef.current = activeId
  }, [devices])

  useEffect(() => {
    const activeDevice = devices.find((d) => d.is_active)
    if (activeDevice && typeof activeDevice.volume_percent === 'number') {
      if (activeDevice.volume_percent !== volume) {
        setVolume(activeDevice.volume_percent)
      }
    }
  }, [devices, volume, setVolume])

  const resolveTargetDeviceId = useCallback(() => {
    if (selectedDeviceId) {
      return selectedDeviceId
    }
    const activeDevice = devices.find((device) => device.is_active)
    return activeDevice?.id
  }, [devices, selectedDeviceId])

  const sendSpotifyCommand = useCallback(
    (command: SpotifyCommand, overriddenDeviceId?: string) => {
      const targetDeviceId =
        overriddenDeviceId !== undefined
          ? overriddenDeviceId
          : resolveTargetDeviceId()
      const message: SpotifyCommandMessage = {
        type: 'SPOTIFY_COMMAND',
        command,
        ...(targetDeviceId ? { deviceId: targetDeviceId } : {}),
      }
      sendData(message)
    },
    [resolveTargetDeviceId, sendData]
  )

  const handleTrackSelect = (uri: string) => {
    const targetDeviceId = resolveTargetDeviceId()
    const message: SpotifyCommandMessage = {
      type: 'SPOTIFY_COMMAND',
      command: 'PLAY',
      uri: uri,
      ...(targetDeviceId ? { deviceId: targetDeviceId } : {}),
    }
    sendData(message)
  }

  const handlePlaybackCommand = useCallback(
    (command: SpotifyCommand) => {
      if (
        command === 'PLAY' ||
        command === 'PAUSE' ||
        command === 'NEXT' ||
        command === 'PREVIOUS'
      ) {
        sendSpotifyCommand(command)
      }
    },
    [sendSpotifyCommand]
  )

  const sendVolumeCommand = useCallback(
    (value: number) => {
      if (connectionStatus !== 'Connected') return
      const targetDeviceId = resolveTargetDeviceId()

      if (!targetDeviceId) return

      const sanitized = clampVolume(value)
      const messageKey = `${targetDeviceId}:${sanitized}`
      if (lastSentVolumeRef.current === messageKey) return
      const message: SpotifyCommandMessage = {
        type: 'SPOTIFY_COMMAND',
        command: 'SET_VOLUME',
        volume: sanitized,
        ...(targetDeviceId ? { deviceId: targetDeviceId } : {}),
      }
      sendData(message)
      lastSentVolumeRef.current = messageKey
    },
    [connectionStatus, resolveTargetDeviceId, sendData]
  )

  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (connectionStatus !== 'Connected') {
      lastSentVolumeRef.current = null
    }
  }, [connectionStatus])

  useEffect(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }

    debounceTimeoutRef.current = setTimeout(() => {
      sendVolumeCommand(volume)
    }, 300)

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
    }
  }, [volume, sendVolumeCommand])

  return {
    selectedDeviceId,
    setSelectedDeviceId,
    devices,
    volume,
    setVolume,
    muted,
    toggleMute,
    sendSpotifyCommand,
    handleTrackSelect,
    handlePlaybackCommand,
  }
}

export default useSpotifyControls
