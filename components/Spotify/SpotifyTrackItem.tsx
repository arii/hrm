import MusicNote from '@mui/icons-material/MusicNote'
import Avatar from '@mui/material/Avatar'
import ListItem from '@mui/material/ListItem'
import ListItemAvatar from '@mui/material/ListItemAvatar'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import Typography from '@mui/material/Typography'
import React from 'react'
import { SpotifyPlaylistItem as Track } from '@/types/core'
import { formatDuration } from '@/lib/utils'

interface SpotifyTrackItemProps {
  track: Track
  onClick: () => void
  isPlaying?: boolean
  secondaryAction?: React.ReactNode
  divider?: boolean
}

export const SpotifyTrackItem: React.FC<SpotifyTrackItemProps> = ({
  track,
  onClick,
  isPlaying = false,
  secondaryAction,
  divider = true,
}) => {
  const images = track.album?.images
  const imageUrl = images?.[2]?.url || images?.[0]?.url

  return (
    <ListItem
      divider={divider}
      disablePadding
      secondaryAction={
        secondaryAction || (
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {formatDuration(track.duration_ms, {
              unit: 'milliseconds',
              format: 'MM:SS',
            })}
          </Typography>
        )
      }
      sx={{
        backgroundColor: isPlaying ? 'action.selected' : 'inherit',
      }}
    >
      <ListItemButton onClick={onClick} sx={{ py: 0.5, px: 1 }}>
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
