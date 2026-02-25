// components/Spotify/PlaylistSelector.tsx
import MusicNote from '@mui/icons-material/MusicNote'
import PlayArrow from '@mui/icons-material/PlayArrow'
import Search from '@mui/icons-material/Search'
import Alert from '@mui/material/Alert'
import Autocomplete, {
  AutocompleteChangeReason,
} from '@mui/material/Autocomplete'
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
import { SpotifyPlaylist as Playlist } from '../../types/core'

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
    let active = true
    Promise.resolve().then(() => active && setLoading(true))
    fetch(API_SPOTIFY_PLAYLISTS)
      .then((res) => (res.ok ? res.json() : Promise.reject('Failed to fetch')))
      .then((data) => {
        if (!active) return
        setPresetPlaylists(
          (data.presetPlaylists || []).map((p: Playlist) => ({
            ...p,
            isPreset: true,
          }))
        )
        setUserPlaylists(
          (data.userPlaylists || []).map((p: Playlist) => ({
            ...p,
            isPreset: false,
          }))
        )
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : String(err))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true
    if (!debouncedSearch.trim()) {
      Promise.resolve().then(() => active && setSearchResults([]))
      return
    }
    Promise.resolve().then(() => active && setSearchLoading(true))
    fetch(
      `/api/spotify/playlists/search?q=${encodeURIComponent(debouncedSearch)}`
    )
      .then((res) => (res.ok ? res.json() : Promise.reject('Search failed')))
      .then((data) => {
        if (active) setSearchResults(data.items || [])
      })
      .catch(() => {
        if (active) setSearchResults([])
      })
      .finally(() => {
        if (active) setSearchLoading(false)
      })
    return () => {
      active = false
    }
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

  const handlePlaylistSelect = (
    playlist: Playlist | null,
    reason?: AutocompleteChangeReason
  ) => {
    if (reason === 'selectOption' && playlist) {
      onPlaylistSelected(playlist.uri)
      setSelectedPlaylist(null)
      setSearchQuery('')
    } else {
      setSelectedPlaylist(playlist)
      if (reason === 'clear') {
        setSearchQuery('')
      }
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
        onChange={(_, newValue, reason) =>
          handlePlaylistSelect(newValue, reason)
        }
        inputValue={searchQuery}
        onInputChange={(_, newInputValue) => setSearchQuery(newInputValue)}
        slotProps={{
          clearIndicator: {
            'aria-label': 'Clear search',
            title: 'Clear search',
          },
        }}
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
                <React.Fragment>
                  {searchLoading ? (
                    <CircularProgress color="inherit" size={20} />
                  ) : null}
                  {params.InputProps.endAdornment}
                </React.Fragment>
              ),
            }}
          />
        )}
        renderOption={({ key, ...props }, option) => (
          <Box
            component="li"
            key={key}
            {...props}
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              p: '4px 16px !important',
            }}
            aria-label={`Select playlist: ${option.name}, ${selectedPlaylist?.uri === option.uri ? 'selected' : 'not selected'}`}
          >
            <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}>
              {option.imageUrl ? (
                <Box
                  component="img"
                  src={option.imageUrl}
                  alt=""
                  sx={{ width: 40, height: 40, borderRadius: 1, mr: 1.5 }}
                />
              ) : (
                <MusicNote sx={{ mr: 1.5, color: 'text.secondary' }} />
              )}
              <ListItemText
                primary={option.name}
                secondary={
                  option.trackCount !== undefined
                    ? `${option.trackCount} tracks`
                    : option.owner
                }
              />
              {option.isPreset && (
                <Chip label="Preset" size="small" sx={{ height: 20, ml: 1 }} />
              )}
              {option.isSearchResult && !option.isPreset && (
                <Chip
                  label="Spotify"
                  size="small"
                  color="success"
                  sx={{ height: 20, ml: 1 }}
                />
              )}
            </Box>
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation()
                onPlaylistPlay(option.uri)
              }}
              aria-label={`Play playlist: ${option.name}`}
            >
              <PlayArrow />
            </IconButton>
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
