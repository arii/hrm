import React from 'react'
import Avatar from '@mui/material/Avatar'
import ListItem from '@mui/material/ListItem'
import ListItemAvatar from '@mui/material/ListItemAvatar'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import Typography from '@mui/material/Typography'
import MusicNoteIcon from '@mui/icons-material/MusicNote'
import { formatDuration } from '@/lib/utils'
import { getArtistNames } from '@/lib/spotify'
import { SpotifyPlaylistItem } from '@/types/core'

interface TrackListItemProps {
  track: SpotifyPlaylistItem
  onClick: () => void
  secondaryAction?: React.ReactNode
  isSelected?: boolean
}

export const TrackListItem: React.FC<TrackListItemProps> = ({
  track,
  onClick,
  secondaryAction,
  isSelected = false,
}) => {
  const albumName = track.album?.name || 'Single'
  const albumThumbnail = track.album?.images?.at(-1)?.url || ''

  return (
    <ListItem
      divider
      disablePadding
      sx={{
        backgroundColor: isSelected ? 'action.selected' : 'inherit',
      }}
      secondaryAction={
        secondaryAction ||
        (!!track.duration_ms && (
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {formatDuration(track.duration_ms, {
              unit: 'milliseconds',
              format: 'MM:SS',
            })}
          </Typography>
        ))
      }
    >
      <ListItemButton onClick={onClick} sx={{ py: 0.5, px: 1 }}>
        <ListItemAvatar sx={{ minWidth: 48 }}>
          <Avatar
            variant="rounded"
            src={albumThumbnail}
            alt={track.name}
            sx={{ width: 32, height: 32 }}
          >
            <MusicNoteIcon fontSize="small" />
          </Avatar>
        </ListItemAvatar>
        <ListItemText
          primary={track.name}
          secondary={`${getArtistNames(track.artists)} • ${albumName}`}
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
