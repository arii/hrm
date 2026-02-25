// components/Spotify/PlaylistSelector.tsx
import MusicNote from '@mui/icons-material/MusicNote'
import PlayArrow from '@mui/icons-material/PlayArrow'
import Search from '@mui/icons-material/Search'
import {
  Alert,
  Autocomplete,
  AutocompleteChangeReason,
  Box,
  Chip,
  CircularProgress,
  IconButton,
  List,
  ListItemText,
  TextField,
  Typography,
} from '@mui/material'
import React, { useEffect, useMemo, useReducer, useState } from 'react'
import { useDebounce } from '../../hooks/useDebounce'
import { API_SPOTIFY_PLAYLISTS } from '../../constants/apiEndpoints'
import { SpotifyPlaylist as Playlist } from '../../types/core'

interface PlaylistSelectorProps {
  onPlaylistSelected: (uri: string) => void
  onPlaylistPlay: (uri: string) => void
}

interface PlaylistState {
  presets: Playlist[]
  user: Playlist[]
  results: Playlist[]
  loading: boolean
  searchLoading: boolean
  error: string | null
}

const PlaylistSelector: React.FC<PlaylistSelectorProps> = ({
  onPlaylistSelected,
  onPlaylistPlay,
}) => {
  const [state, dispatch] = useReducer(
    (s: PlaylistState, a: Partial<PlaylistState>) => ({ ...s, ...a }),
    {
      presets: [],
      user: [],
      results: [],
      loading: true,
      searchLoading: false,
      error: null,
    }
  )
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(
    null
  )
  const debouncedSearch = useDebounce(searchQuery, 500)

  useEffect(() => {
    let active = true
    dispatch({ loading: true })
    fetch(API_SPOTIFY_PLAYLISTS)
      .then((res) => (res.ok ? res.json() : Promise.reject('Failed to fetch')))
      .then((data) => {
        if (!active) return
        dispatch({
          presets: (data.presetPlaylists || []).map((p: Playlist) => ({
            ...p,
            isPreset: true,
          })),
          user: (data.userPlaylists || []).map((p: Playlist) => ({
            ...p,
            isPreset: false,
          })),
        })
      })
      .catch(
        (err: unknown) =>
          active &&
          dispatch({ error: err instanceof Error ? err.message : String(err) })
      )
      .finally(() => active && dispatch({ loading: false }))
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true
    if (!debouncedSearch.trim()) {
      dispatch({ results: [] })
      return
    }
    dispatch({ searchLoading: true })
    fetch(
      `/api/spotify/playlists/search?q=${encodeURIComponent(debouncedSearch)}`
    )
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => active && dispatch({ results: data.items || [] }))
      .catch(() => active && dispatch({ results: [] }))
      .finally(() => active && dispatch({ searchLoading: false }))
    return () => {
      active = false
    }
  }, [debouncedSearch])

  const allPlaylists = useMemo(
    () => [...state.presets, ...state.user],
    [state.presets, state.user]
  )

  const filteredPlaylists = useMemo(() => {
    const query = debouncedSearch.toLowerCase().trim()
    if (!query) return allPlaylists
    const local = allPlaylists.filter((p) =>
      p.name.toLowerCase().includes(query)
    )
    const combined = [...local]
    const uris = new Set(local.map((p) => p.uri))
    state.results.forEach((p) => {
      if (!uris.has(p.uri)) combined.push({ ...p, isSearchResult: true })
    })
    return combined
  }, [allPlaylists, debouncedSearch, state.results])

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
      if (reason === 'clear') setSearchQuery('')
    }
  }

  if (state.loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading...</Typography>
      </Box>
    )
  }

  if (state.error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {state.error}
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
        onInputChange={(_, val) => setSearchQuery(val)}
        slotProps={{
          clearIndicator: { 'aria-label': 'Clear', title: 'Clear' },
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            placeholder="Search playlists..."
            InputProps={{
              ...params.InputProps,
              startAdornment: (
                <Search sx={{ color: 'text.secondary', mr: 1 }} />
              ),
              endAdornment: (
                <>
                  {state.searchLoading && (
                    <CircularProgress color="inherit" size={20} />
                  )}
                  {params.InputProps.endAdornment}
                </>
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
          debouncedSearch
            ? `No playlists found matching "${debouncedSearch}"`
            : 'No playlists available'
        }
        sx={{ mb: 2 }}
        ListboxComponent={List}
      />
    </Box>
  )
}

export default PlaylistSelector
