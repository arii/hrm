// File: app/client/control/components/SelectedSpotifyItemDisplay.tsx
'use client'

import { useWebSocket } from '@/context/WebSocketContext'
import { Card, CardContent, CardMedia, Typography, Box } from '@mui/material'
import MusicNoteIcon from '@mui/icons-material/MusicNote'

const SelectedSpotifyItemDisplay = () => {
  const { spotifyData } = useWebSocket()
  const {
    trackName = 'No Track Selected',
    artist = '',
    albumArtUrl = '',
    selectedItem,
  } = spotifyData

  const displayTitle = selectedItem?.name || trackName
  const displayArtist =
    selectedItem?.type === 'playlist' ? selectedItem?.owner : artist
  const displayImage = selectedItem?.imageUrl || albumArtUrl

  const hasSelectedItem = !!selectedItem

  if (!hasSelectedItem) {
    return null // Don't render anything if no item is selected
  }

  return (
    <Card
      data-testid="selected-spotify-item-display"
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: 'center',
        mb: 2,
        background: 'rgba(40, 50, 70, 0.5)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: 2,
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
        p: 1.5,
      }}
    >
      <CardMedia
        component="img"
        sx={{
          width: { xs: '100%', sm: 80 },
          height: { xs: 'auto', sm: 80 },
          objectFit: 'cover',
          borderRadius: 1.5,
          mr: { sm: 2 },
          mb: { xs: 1.5, sm: 0 },
        }}
        image={displayImage}
        alt={displayTitle}
      />
      <Box sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
        <CardContent sx={{ p: '0 !important' }}>
          <Typography
            variant="subtitle1"
            component="div"
            sx={{ fontWeight: 'bold' }}
          >
            {displayTitle}
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: 'flex', alignItems: 'center' }}
          >
            <MusicNoteIcon fontSize="small" sx={{ mr: 0.5 }} />
            {displayArtist}
          </Typography>
        </CardContent>
      </Box>
    </Card>
  )
}

export default SelectedSpotifyItemDisplay
