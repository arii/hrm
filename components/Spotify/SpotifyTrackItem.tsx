import {
  ListItem,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  Avatar,
  Typography,
  IconButton,
  Box,
} from '@mui/material'
import { MusicNote, PlayArrow, Pause } from '@mui/icons-material'
import { SpotifyPlaylistItem as Track } from '@/types/core'
import { formatDuration } from '@/lib/utils'

interface SpotifyTrackItemProps {
  track: Track
  index: number
  isPlaying?: boolean
  onTogglePlay: (track: Track, index: number) => void
  showPlaybackControls?: boolean
  divider?: boolean
}

export const SpotifyTrackItem = ({
  track,
  index,
  isPlaying = false,
  onTogglePlay,
  showPlaybackControls = false,
  divider = true,
}) => {
  const images = track.album?.images
  const imageUrl = images?.[2]?.url || images?.[0]?.url

  return (
    <ListItem
      divider={divider}
      disablePadding
      secondaryAction={secondaryAction}
      sx={{
        backgroundColor: isPlaying ? 'action.selected' : 'inherit',
      }}
    >
      <ListItemButton
        onClick={() => onTogglePlay(track, index)}
        sx={{ py: 0.5, px: 1 }}
      >
        <ListItemAvatar sx={{ minWidth: 48 }}>
          <Avatar
            variant="rounded"
            src={imageUrl}
            sx={{ width: 32, height: 32 }}
          >
            <MusicNote fontSize="small" />
          </Avatar>
        </ListItemAvatar>
        <ListItemText
          primary={track.name}
          secondary={`${track.artists.map((a) => a.name).join(', ')} • ${track.album.name}`}
          primaryTypographyProps={{
            variant: 'body2',
            noWrap: true,
            fontWeight: 'medium',
          }}
          secondaryTypographyProps={{
            variant: 'caption',
            noWrap: true,
          }}
        />
      </ListItemButton>
    </ListItem>
  )
}
