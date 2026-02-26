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
  const [presets, setPresets] = useState<Playlist[]>([])
  const [userPlaylists, setUserPlaylists] = useState<Playlist[]>([])
  const [searchResults, setSearchResults] = useState<Playlist[]>([])
  const [loading, setLoading] = useState(true)
  const [searchLoading, setSearchLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null)
  const debouncedSearch = useDebounce(searchQuery, 500)

  useEffect(() => {
    let active = true
    const fetchPlaylists = async () => {
      setLoading(true)
      try {
        const res = await fetch(API_SPOTIFY_PLAYLISTS)
        if (!active) return

        if (!res.ok) throw new Error('Failed to fetch playlists')

        const data = await res.json()
        if (active) {
          setPresets((data.presetPlaylists || []).map((p: Playlist) => ({
            ...p,
            isPreset: true,
          })))
          setUserPlaylists((data.userPlaylists || []).map((p: Playlist) => ({
            ...p,
            isPreset: false,
          })))
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : String(err))
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    fetchPlaylists()
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true
    const searchPlaylists = async () => {
      if (!debouncedSearch.trim()) {
        setSearchResults([])
        return
      }

      setSearchLoading(true)
      try {
        const res = await fetch(
          `/api/spotify/playlists/search?q=${encodeURIComponent(debouncedSearch)}`
        )
        if (!active) return

        if (!res.ok) throw new Error('Search failed')

        const data = await res.json()
        if (active) setSearchResults(data.items || [])
      } catch {
        if (active) setSearchResults([])
      } finally {
        if (active) setSearchLoading(false)
      }
    }

    searchPlaylists()
    return () => {
      active = false
    }
  }, [debouncedSearch])

  const allLocal = useMemo(
    () => [...presets, ...userPlaylists],
    [presets, userPlaylists]
  )

  const filteredPlaylists = useMemo(() => {
    const query = debouncedSearch.toLowerCase().trim()
    if (!query) return allLocal

    const local = allLocal.filter((p) =>
      p.name.toLowerCase().includes(query)
    )
    const combined = [...local]
    const uris = new Set(local.map((p) => p.uri))

    searchResults.forEach((p) => {
      if (!uris.has(p.uri)) {
        combined.push({ ...p, isSearchResult: true })
      }
    })
    return combined
  }, [allLocal, debouncedSearch, searchResults])

  const handlePlaylistSelect = (
    playlist: Playlist | null,
    reason?: AutocompleteChangeReason
  ) => {
    if (reason === 'clear') {
      setSearchQuery('')
      setSelectedPlaylist(null)
    } else if (reason === 'selectOption' && playlist) {
      onPlaylistSelected(playlist.uri)
      setSelectedPlaylist(null)
      setSearchQuery('')
    } else {
      setSelectedPlaylist(playlist)
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading...</Typography>
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
        onInputChange={(_, val) => setSearchQuery(val)}
        slotProps={{
          clearIndicator: {
            'aria-label': 'Clear search',
            title: 'Clear search',
          },
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
                  {searchLoading && (
                    <CircularProgress color="inherit" size={20} />
                  )}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
          />
        )}
        renderOption={(props, option, state) => {
          const { key, ...liProps } = props
          return (
            <Box
              component="li"
              key={key}
              {...liProps}
              aria-label={`Select playlist: ${option.name}, ${state.selected ? 'selected' : 'not selected'}`}
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                px: 2,
                py: 0.5,
              }}
            >
              <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}>
                {option.imageUrl ? (
                  <Box
                    component="img"
                    src={option.imageUrl}
                    alt={option.name}
                    sx={{ width: 40, height: 40, borderRadius: 1, mr: 1.5 }}
                  />
                ) : (
                  <MusicNote sx={{ mr: 1.5, color: 'text.secondary' }} />
                )}
                <ListItemText
                  primary={option.name}
                  secondary={
                    option.trackCount !== undefined
                      ? `${option.trackCount} tracks${option.owner ? ` • ${option.owner}` : ''}`
                      : option.owner || ''
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
          )
        }}
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
