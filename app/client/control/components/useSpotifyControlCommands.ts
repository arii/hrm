import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { ExecuteSpotify } from '@/hooks/useSpotifyCommand'

interface UseSpotifyControlCommandsParams {
  resolveTargetDeviceId: () => string | undefined
  executeSpotify: ExecuteSpotify
  selectDevice: (deviceId: string) => void
}

/** Command dispatch for the control page (#9298). */
export const useSpotifyControlCommands = ({
  resolveTargetDeviceId,
  executeSpotify,
  selectDevice,
}: UseSpotifyControlCommandsParams) => {
  const router = useRouter()

  const sendSpotifyCommand = useCallback(
    (
      command: 'PLAY' | 'PAUSE' | 'NEXT' | 'PREVIOUS' | 'TRANSFER_PLAYBACK',
      overriddenDeviceId?: string
    ) => {
      const deviceId =
        overriddenDeviceId !== undefined
          ? overriddenDeviceId
          : resolveTargetDeviceId()

      switch (command) {
        case 'PLAY':
          executeSpotify('PLAY', { deviceId })
          break
        case 'PAUSE':
          executeSpotify('PAUSE', { deviceId })
          break
        case 'NEXT':
          executeSpotify('NEXT', { deviceId })
          break
        case 'PREVIOUS':
          executeSpotify('PREVIOUS', { deviceId })
          break
        case 'TRANSFER_PLAYBACK':
          if (deviceId) {
            executeSpotify('TRANSFER_PLAYBACK', { deviceId })
          }
          break
      }
    },
    [resolveTargetDeviceId, executeSpotify]
  )

  const handleTrackSelect = useCallback(
    (uri: string) => {
      const targetDeviceId = resolveTargetDeviceId()
      executeSpotify('PLAY', {
        uri: uri,
        deviceId: targetDeviceId,
      })
    },
    [resolveTargetDeviceId, executeSpotify]
  )

  const handleBrowseClick = useCallback(() => {
    router.push('/client/spotify-selection')
  }, [router])

  const handleDeviceSelect = useCallback(
    (deviceId: string) => {
      selectDevice(deviceId)
      if (deviceId) {
        sendSpotifyCommand('TRANSFER_PLAYBACK', deviceId)
      }
    },
    [selectDevice, sendSpotifyCommand]
  )

  return {
    sendSpotifyCommand,
    handleTrackSelect,
    handleBrowseClick,
    handleDeviceSelect,
  }
}
