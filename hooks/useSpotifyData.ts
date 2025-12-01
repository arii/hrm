'use client'
import { useWebSocket } from '@/context/WebSocketContext'
import { useMemo, useCallback } from 'react'
import { ClientCommandMessage, SpotifyData } from '@/types/websocket'

export const useSpotifyData = (): {
  spotifyData: SpotifyData
  sendData: (data: ClientCommandMessage) => void
} => {
  const { spotifyData, sendData } = useWebSocket()
  const {
    trackName,
    artist,
    isPlaying,
    progressMs,
    durationMs,
    albumArtUrl,
  } = spotifyData

  const stableSendData = useCallback(
    (data: ClientCommandMessage) => {
      sendData(data)
    },
    [sendData]
  )

  return useMemo(
    () => ({
      spotifyData: {
        trackName,
        artist,
        isPlaying,
        progressMs,
        durationMs,
        albumArtUrl,
      },
      sendData: stableSendData,
    }),
    [
      trackName,
      artist,
      isPlaying,
      progressMs,
      durationMs,
      albumArtUrl,
      stableSendData,
    ]
  )
}
