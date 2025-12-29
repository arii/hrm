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
import List from '@mui/material/List'
import ListItemText from '@mui/material/ListItemText'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import React, { useEffect, useMemo, useState } from 'react'
import { useDebounce } from '../../hooks/useDebounce'
import { API_SPOTIFY_PLAYLISTS } from '../../constants/apiEndpoints'
import { Playlist } from '../../types/spotify'

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

  useEffect(() => {
    if (!debouncedSearch.trim()) {
      setSearchResults([])
      return
    }

    const fetchSearchResults = async () => {
      setSearchLoading(true)
      try {
        const response = await fetch(
          `/api/spotify/playlists/search?q=${encodeURIComponent(
            debouncedSearch
          )}`
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
    const query = debouncedSearch.toLowerCase().trim()
    if (!query) {
      return allPlaylists
    }

    const localMatches = allPlaylists.filter((playlist) =>
      playlist.name.toLowerCase().includes(query)
    )

    const combined = [...localMatches]
    const existingUris = new Set(localMatches.map((p) => p.uri))

    searchResults.forEach((playlist) => {
      if (!existingUris.has(playlist.uri)) {
        combined.push({ ...playlist, isSearchResult: true })
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
      <Autocomplete
        options={filteredPlaylists}
        getOptionLabel={(option) => option.name}
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
              startAdornment: (
                <Search sx={{ color: 'text.secondary', mr: 1 }} />
              ),
              endAdornment: (
                <>
                  {searchLoading ? (
                    <CircularProgress size={20} />
                  ) : searchQuery ? (
                    <IconButton
                      size="small"
                      onClick={() => setSearchQuery('')}
                      aria-label="Clear search"
                    >
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  ) : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
          />
        )}
        renderOption={(props, option) => (
          <Box
            component="li"
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              width: '100%',
              py: 0.5,
              // Use Autocomplete's hover state for background color
              '&[aria-selected="true"]': {
                backgroundColor: 'action.hover',
              },
              '&:hover': {
                backgroundColor: 'action.hover',
              },
            }}
            {...props}
            aria-label={`Select playlist: ${option.name}`}
          >
            <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}>
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
              <ListItemText
                primary={option.name}
                secondary={
                  option.trackCount !== undefined
                    ? `${option.trackCount} tracks${
                        option.owner ? ` • ${option.owner}` : ''
                      }`
                    : option.owner
                    ? option.owner
                    : undefined
                }
              />
              {option.isPreset && (
                <Chip
                  label="Preset"
                  size="small"
                  sx={{ height: 20, fontSize: '0.7rem', ml: 1 }}
                />
              )}
              {option.isSearchResult && !option.isPreset && (
                <Chip
                  label="Spotify"
                  size="small"
                  color="success"
                  sx={{ height: 20, fontSize: '0.7rem', ml: 1 }}
                />
              )}
            </Box>
            <Box sx={{ pl: 1, display: 'flex', alignItems: 'center' }}>
              <IconButton
                edge="end"
                aria-label={`Play ${option.name}`}
                onClick={(e) => {
                  e.stopPropagation() // Prevent Autocomplete from closing
                  onPlaylistPlay(option.uri)
                }}
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
          </Box>
        )}
        groupBy={(option) => {
          if (option.isSearchResult) return 'Spotify Results'
          if (option.isPreset) return 'Preset Playlists'
          return 'Your Playlists'
        }}
        noOptionsText={
          debouncedSearch ? (
            // eslint-disable-next-line react/no-unescaped-entities
            <>No playlists found matching "{debouncedSearch}"</>
          ) : (
            'No playlists available'
          )
        }
        sx={{ mb: 2 }}
        ListboxComponent={List}
      />
    </Box>
  )
}

export default PlaylistSelector
