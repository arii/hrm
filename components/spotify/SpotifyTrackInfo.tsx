// components/spotify/SpotifyTrackInfo.tsx
'use client'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Image from 'next/image'

interface SpotifyTrackInfoProps {
  trackName: string
  artist: string
  albumArtUrl: string
}

const SpotifyTrackInfo = ({
  trackName,
  artist,
  albumArtUrl,
}: SpotifyTrackInfoProps) => {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      {albumArtUrl && (
        <Image
          src={albumArtUrl}
          alt={trackName}
          width={64}
          height={64}
          style={{ borderRadius: '4px' }}
        />
      )}
      <Box>
        <Typography variant="h6">{trackName}</Typography>
        <Typography variant="body2">{artist}</Typography>
      </Box>
    </Box>
  )
}

export default SpotifyTrackInfo
