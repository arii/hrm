// components/Spotify/PlaylistSelector.tsx
import ClearIcon from '@mui/icons-material/Clear'
import MusicNote from '@mui/icons-material/MusicNote'
import PlayArrow from '@mui/icons-material/PlayArrow'
import Search from '@mui/icons-material/Search'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import Paper from '@mui/material/Paper'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import React, { useEffect, useMemo, useState } from 'react'
import { useDebounce } from '../../hooks/useDebounce'
import { API_SPOTIFY_PLAYLISTS } from '../../constants/apiEndpoints'

interface Playlist {
  name: string
  uri: string
  id?: string
  isPreset?: boolean
  isSearchResult?: boolean
  imageUrl?: string | null
  description?: string | null
  trackCount?: number
  owner?: string
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
    disablePadding
    secondaryAction={
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
    }
  >
    <ListItemButton
      selected={selected}
      onClick={onClick}
      sx={{
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
      {playlist.isPreset && (
        <Chip
          label="Preset"
          size="small"
          sx={{ height: 20, fontSize: '0.7rem', ml: 1 }}
        />
      )}
      {playlist.isSearchResult && !playlist.isPreset && (
        <Chip
          label="Spotify"
          size="small"
          color="success"
          sx={{ height: 20, fontSize: '0.7rem', ml: 1 }}
        />
      )}
    </ListItemButton>
  </ListItem>
)

interface PlaylistSelectorProps {
  onPlaylistSelected: (uri: string) => void
  onPlaylistPlay: (uri: string) => void
}

const PlaylistSelector: React.FC<PlaylistSelectorProps> = ({
  onPlaylistSelected,
  onPlaylistPlay,
}) => {
  const [presetPlaylists, setPresetPlaylists] = useState<Playlist[]>([])
  const [userPlaylists, setUserPlaylists] = useState<Playlist[]>([])
  const [searchResults, setSearchResults] = useState<Playlist[]>([])
  const [loading, setLoading] = useState(true)
  const [searchLoading, setSearchLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPlaylistUri, setSelectedPlaylistUri] = useState<string | null>(
    null
  )

  const debouncedSearch = useDebounce(searchQuery, 500)

  useEffect(() => {
    const fetchPlaylists = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch(API_SPOTIFY_PLAYLISTS)
        if (!response.ok) {
          throw new Error('Failed to fetch playlists')
        }
        const data = await response.json()
        const presets = (data.presetPlaylists || []).map((p: Playlist) => ({
          ...p,
          isPreset: true,
        }))
        const user = (data.userPlaylists || []).map((p: Playlist) => ({
          ...p,
          isPreset: false,
        }))
        setPresetPlaylists(presets)
        setUserPlaylists(user)
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Failed to fetch playlists'
        setError(message)
        console.error('Error fetching playlists:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchPlaylists()
  }, [])

  useEffect(() => {
    if (!debouncedSearch.trim()) {
      setSearchResults([])
      return
    }

    const fetchSearchResults = async () => {
      setSearchLoading(true)
      try {
        const response = await fetch(
          `/api/spotify/playlists/search?q=${encodeURIComponent(debouncedSearch)}`
        )
        if (!response.ok) {
          throw new Error('Failed to search playlists')
        }
        const data = await response.json()
        setSearchResults(data.items || [])
      } catch (error) {
        console.error('Error searching playlists:', error)
        setSearchResults([])
      } finally {
        setSearchLoading(false)
      }
    }

    fetchSearchResults()
  }, [debouncedSearch])

  const allPlaylists = useMemo(() => {
    return [...presetPlaylists, ...userPlaylists]
  }, [presetPlaylists, userPlaylists])

  const filteredPlaylists = useMemo(() => {
    if (!debouncedSearch.trim()) {
      return []
    }

    const query = debouncedSearch.toLowerCase()
    const localMatches = allPlaylists.filter((playlist) =>
      playlist.name.toLowerCase().includes(query)
    )

    const combined = [...localMatches]
    const existingUris = new Set(localMatches.map((p) => p.uri))

    searchResults.forEach((playlist) => {
      if (!existingUris.has(playlist.uri)) {
        combined.push(playlist)
      }
    })

    return combined
  }, [allPlaylists, debouncedSearch, searchResults])

  const handlePlaylistSelect = (playlist: Playlist) => {
    setSelectedPlaylistUri(playlist.uri)
    onPlaylistSelected(playlist.uri)
  }

  if (loading) {
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
        <Typography sx={{ ml: 2 }}>Loading playlists...</Typography>
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
      <TextField
        fullWidth
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search or browse playlists..."
        sx={{
          mb: 2,
          '& .MuiOutlinedInput-root': {
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: 'primary.main',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: 'primary.main',
              boxShadow: `0 0 0 2px rgba(25, 118, 210, 0.2)`,
            },
          },
        }}
        InputProps={{
          startAdornment: <Search sx={{ color: 'text.secondary', mr: 1 }} />,
          endAdornment: (
            <>
              {searchLoading ? (
                <CircularProgress size={20} sx={{ mr: 1 }} />
              ) : searchQuery ? (
                <IconButton
                  size="small"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                >
                  <ClearIcon fontSize="small" />
                </IconButton>
              ) : null}
            </>
          ),
        }}
      />

      <Paper variant="outlined" sx={{ maxHeight: 400, overflow: 'auto' }}>
        <List dense>
          {searchQuery ? (
            <>
              {filteredPlaylists.length > 0 ? (
                filteredPlaylists.map((playlist) => (
                  <PlaylistItem
                    key={playlist.uri}
                    playlist={playlist}
                    selected={selectedPlaylistUri === playlist.uri}
                    onClick={() => handlePlaylistSelect(playlist)}
                    onPlay={(e) => {
                      e.stopPropagation()
                      onPlaylistPlay(playlist.uri)
                    }}
                  />
                ))
              ) : !searchLoading ? (
                <ListItem>
                  <ListItemText
                    primary="No results found"
                    secondary={`No playlists found matching "${searchQuery}"`}
                    sx={{ textAlign: 'center', py: 2 }}
                  />
                </ListItem>
              ) : null}
            </>
          ) : (
            <>
              {presetPlaylists.length > 0 && (
                <>
                  <ListItem>
                    <ListItemText
                      primary={
                        <Typography variant="overline" color="text.secondary">
                          Preset Playlists
                        </Typography>
                      }
                    />
                  </ListItem>
                  {presetPlaylists.map((playlist) => (
                    <PlaylistItem
                      key={playlist.uri}
                      playlist={playlist}
                      selected={selectedPlaylistUri === playlist.uri}
                      onClick={() => handlePlaylistSelect(playlist)}
                      onPlay={(e) => {
                        e.stopPropagation()
                        onPlaylistPlay(playlist.uri)
                      }}
                    />
                  ))}
                  {userPlaylists.length > 0 && <Divider sx={{ my: 1 }} />}
                </>
              )}
              {userPlaylists.length > 0 && (
                <>
                  <ListItem>
                    <ListItemText
                      primary={
                        <Typography variant="overline" color="text.secondary">
                          Your Playlists ({userPlaylists.length})
                        </Typography>
                      }
                    />
                  </ListItem>
                  {userPlaylists.map((playlist) => (
                    <PlaylistItem
                      key={playlist.uri}
                      playlist={playlist}
                      selected={selectedPlaylistUri === playlist.uri}
                      onClick={() => handlePlaylistSelect(playlist)}
                      onPlay={(e) => {
                        e.stopPropagation()
                        onPlaylistPlay(playlist.uri)
                      }}
                    />
                  ))}
                </>
              )}
            </>
          )}
        </List>
      </Paper>
    </Box>
  )
}

export default PlaylistSelector
