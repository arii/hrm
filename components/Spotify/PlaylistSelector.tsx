// components/Spotify/PlaylistSelector.tsx
import ClearIcon from '@mui/icons-material/Clear'
import MusicNote from '@mui/icons-material/MusicNote'
import PlayArrow from '@mui/icons-material/PlayArrow'
import Search from '@mui/icons-material/Search'
import Alert from '@mui/material/Alert'
import Autocomplete from '@mui/material/Autocomplete'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import IconButton from '@mui/material/IconButton'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
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
  onPlay: (event: React.MouseEvent<HTMLElement>) => void
}

const PlaylistItemContent: React.FC<PlaylistItemProps> = ({
  playlist,
  onPlay,
}) => (
  <>
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
    <Box sx={{ pl: 1 }}>
      <IconButton
        edge="end"
        aria-label={`Play ${playlist.name}`}
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
  </>
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
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchLoading, setSearchLoading] = useState(false)
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(
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

  // Fetch search results when user types
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
      return allPlaylists
    }

    // When searching, combine local matches with Spotify search results
    const query = debouncedSearch.toLowerCase()
    const localMatches = allPlaylists.filter((playlist) =>
      playlist.name.toLowerCase().includes(query)
    )

    // Combine local matches with search results, removing duplicates by URI
    const combined = [...localMatches]
    const existingUris = new Set(localMatches.map((p) => p.uri))

    searchResults.forEach((playlist) => {
      if (!existingUris.has(playlist.uri)) {
        combined.push(playlist)
      }
    })

    return combined
  }, [allPlaylists, debouncedSearch, searchResults])

  const handlePlaylistSelect = (playlist: Playlist | null) => {
    setSelectedPlaylist(playlist)
    if (playlist) {
      onPlaylistSelected(playlist.uri)
    }
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
      {/*
        This Autocomplete component is used to display the playlist selector.
        It was chosen to fix a "squished UI" issue that occurred with a
        previous implementation that used a separate input and list.
      */}
      <Autocomplete
        options={filteredPlaylists}
        getOptionLabel={(option) => option.name}
        filterOptions={(x) => x}
        loading={loading || searchLoading}
        groupBy={(option) =>
          option.isPreset
            ? 'Preset Playlists'
            : option.isSearchResult
              ? 'Spotify Search Results'
              : 'Your Playlists'
        }
        value={selectedPlaylist}
        onChange={(_, newValue) => handlePlaylistSelect(newValue)}
        inputValue={searchQuery}
        onInputChange={(_, newInputValue) => setSearchQuery(newInputValue)}
        renderInput={(params) => (
          <TextField
            {...params}
            placeholder="Search or browse playlists..."
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {loading || searchLoading ? (
                    <CircularProgress color="inherit" size={20} />
                  ) : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
            sx={{
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
          />
        )}
        renderOption={(props, option) => {
          const { key, ...optionProps } = props
          return (
            <ListItem {...optionProps} key={key} divider>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                width: '100%',
              }}
            >
              {option.imageUrl ? (
                <Box
                  component="img"
                  src={option.imageUrl}
                  alt={option.name}
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 1,
                    mr: 1.5,
                    objectFit: 'cover',
                  }}
                />
              ) : (
                <MusicNote
                  sx={{ mr: 1.5, color: 'text.secondary', fontSize: 24 }}
                />
              )}
              <PlaylistItemContent
                playlist={option}
                onPlay={(e) => {
                  e.stopPropagation()
                  onPlaylistPlay(option.uri)
                }}
              />
            </div>
          </ListItem>
          )
        }}
        noOptionsText={
          debouncedSearch ? (
            <>No playlists found matching &quot;{debouncedSearch}&quot;</>
          ) : (
            'No playlists available'
          )
        }
        sx={{ mb: 2 }}
        ListboxProps={{
          style: {
            maxHeight: '40vh',
          },
        }}
      />
    </Box>
  )
}

export default PlaylistSelector
