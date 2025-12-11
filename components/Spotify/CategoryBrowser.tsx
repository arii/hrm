// components/Spotify/CategoryBrowser.tsx
'use client'

import MusicNote from '@mui/icons-material/MusicNote'
import PlayArrow from '@mui/icons-material/PlayArrow'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import IconButton from '@mui/material/IconButton'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import React, { useEffect, useState } from 'react'
import { API_SPOTIFY_CATEGORIES } from '../../constants/apiEndpoints'

interface Playlist {
  name: string
  uri: string
  id?: string
  imageUrl?: string | null
  trackCount?: number
  owner?: string
}

interface Category {
  id: string
  name: string
  icons: { url: string }[]
}

interface PlaylistItemProps {
  playlist: Playlist
  selected: boolean
  onClick: () => void
  onPlay: (event: React.MouseEvent<HTMLElement>) => void
}

const PlaylistItem: React.FC<PlaylistItemProps> = ({
  playlist,
  selected,
  onClick,
  onPlay,
}) => (
  <ListItem
    key={playlist.uri}
    divider
    sx={{ display: 'flex', justifyContent: 'space-between' }}
  >
    <ListItemButton
      selected={selected}
      onClick={onClick}
      sx={{
        flexGrow: 1,
        '&:hover': {
          backgroundColor: 'action.hover',
        },
      }}
    >
      {playlist.imageUrl ? (
        <Box
          component="img"
          src={playlist.imageUrl}
          alt={playlist.name}
          sx={{
            width: 48,
            height: 48,
            borderRadius: 1,
            mr: 1.5,
            objectFit: 'cover',
          }}
        />
      ) : (
        <MusicNote sx={{ mr: 1.5, color: 'text.secondary', fontSize: 24 }} />
      )}
      <ListItemText
        primary={playlist.name}
        secondary={
          playlist.trackCount !== undefined
            ? `${playlist.trackCount} tracks${playlist.owner ? ` • ${playlist.owner}` : ''}`
            : playlist.owner
              ? playlist.owner
              : undefined
        }
      />
    </ListItemButton>
    <Box sx={{ pl: 1 }}>
      <IconButton
        edge="end"
        aria-label="play"
        onClick={onPlay}
        sx={{
          '&:hover': {
            backgroundColor: 'action.hover',
            transform: 'scale(1.1)',
          },
        }}
      >
        <PlayArrow />
      </IconButton>
    </Box>
  </ListItem>
)

interface CategoryBrowserProps {
  onPlaylistSelected: (uri: string) => void
  onPlaylistPlay: (uri: string) => void
}

const CategoryBrowser: React.FC<CategoryBrowserProps> = ({
  onPlaylistSelected,
  onPlaylistPlay,
}) => {
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null
  )
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [loadingCategories, setLoadingCategories] = useState(true)
  const [loadingPlaylists, setLoadingPlaylists] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(
    null
  )

  useEffect(() => {
    const fetchCategories = async () => {
      setLoadingCategories(true)
      setError(null)
      try {
        const response = await fetch(API_SPOTIFY_CATEGORIES)
        if (!response.ok) {
          throw new Error('Failed to fetch categories')
        }
        const data = await response.json()
        setCategories(data.categories || [])
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Failed to fetch categories'
        setError(message)
        console.error('Error fetching categories:', error)
      } finally {
        setLoadingCategories(false)
      }
    }

    fetchCategories()
  }, [])

  useEffect(() => {
    if (!selectedCategory) {
      setPlaylists([])
      return
    }

    const fetchPlaylists = async () => {
      setLoadingPlaylists(true)
      setError(null)
      try {
        const response = await fetch(
          `/api/spotify/categories/${selectedCategory.id}/playlists`
        )
        if (!response.ok) {
          throw new Error('Failed to fetch playlists')
        }
        const data = await response.json()
        setPlaylists(data.playlists || [])
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Failed to fetch playlists'
        setError(message)
        console.error('Error fetching playlists:', error)
      } finally {
        setLoadingPlaylists(false)
      }
    }

    fetchPlaylists()
  }, [selectedCategory])

  const handlePlaylistSelect = (playlist: Playlist) => {
    setSelectedPlaylist(playlist)
    onPlaylistSelected(playlist.uri)
  }

  if (loadingCategories) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          py: 4,
        }}
      >
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading categories...</Typography>
      </Box>
    )
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    )
  }

  return (
    <Box>
      <Typography variant="overline" color="text.secondary">
        Fitness Categories
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
        {categories.map((category) => (
          <Chip
            key={category.id}
            label={category.name}
            onClick={() => setSelectedCategory(category)}
            color={selectedCategory?.id === category.id ? 'primary' : 'default'}
          />
        ))}
      </Box>

      {loadingPlaylists ? (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            py: 4,
          }}
        >
          <CircularProgress />
          <Typography sx={{ ml: 2 }}>Loading playlists...</Typography>
        </Box>
      ) : (
        <Paper variant="outlined" sx={{ maxHeight: 300, overflow: 'auto' }}>
          <List dense>
            {playlists.map((playlist) => (
              <PlaylistItem
                key={playlist.uri}
                playlist={playlist}
                selected={selectedPlaylist?.uri === playlist.uri}
                onClick={() => handlePlaylistSelect(playlist)}
                onPlay={(e) => {
                  e.stopPropagation()
                  onPlaylistPlay(playlist.uri)
                }}
              />
            ))}
          </List>
        </Paper>
      )}
    </Box>
  )
}

export default CategoryBrowser
