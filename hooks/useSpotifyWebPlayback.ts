// hooks/useSpotifyWebPlayback.ts
'use client'
import { useSpotifyPlayer } from '@/context/SpotifyPlayerContext'

const useSpotifyWebPlayback = () => {
  return useSpotifyPlayer()
}

export default useSpotifyWebPlayback
