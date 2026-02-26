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
}: SpotifyTrackItemProps) => {
  // Safe image resolution: prefer thumbnail, fallback to any available image
  const albumArtUrl =
    track.album?.images?.[2]?.url || track.album?.images?.[0]?.url

  const secondaryAction = showPlaybackControls ? (
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
      <Typography variant="caption" sx={{ color: 'text.secondary', mr: 2 }}>
        {formatDuration(track.duration_ms, {
          unit: 'milliseconds',
          format: 'MM:SS',
        })}
      </Typography>
      <IconButton
        onClick={() => onTogglePlay(track, index)}
        edge="end"
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? <Pause /> : <PlayArrow />}
      </IconButton>
    </Box>
  ) : (
    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
      {formatDuration(track.duration_ms, {
        unit: 'milliseconds',
        format: 'MM:SS',
      })}
    </Typography>
  )

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
            src={albumArtUrl}
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
