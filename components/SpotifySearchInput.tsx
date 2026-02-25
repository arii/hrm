'use client'

import { Search, MusicNote } from '@mui/icons-material'
import {
  Autocomplete,
  Avatar,
  Box,
  CircularProgress,
  InputAdornment,
  ListItemAvatar,
  ListItemText,
  TextField,
  Typography,
} from '@mui/material'
import { useSnackbar } from 'notistack'
import React, { useEffect, useState } from 'react'
import { useDebounce } from '@/hooks/useDebounce'

interface SpotifyTrack {
  id: string
  name: string
  artists: { name: string }[]
  album: {
    images: { url: string }[]
    name: string
  }
  uri: string
}

interface SpotifySearchInputProps {
  onTrackSelect?: (trackUri: string) => void
}

const SpotifySearchInput = ({ onTrackSelect }: SpotifySearchInputProps) => {
  const [query, setQuery] = useState('')
  const [value, setValue] = useState<SpotifyTrack | string | null>(null)
  const [results, setResults] = useState<SpotifyTrack[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const { enqueueSnackbar } = useSnackbar()

  // Debounce the search query by 500ms
  const debouncedQuery = useDebounce(query, 500)

  // Effect to trigger search when debounced query changes
  useEffect(() => {
    const searchSpotify = async () => {
      if (!debouncedQuery.trim()) {
        setResults([])
        setHasSearched(false)
        return
      }

      setIsLoading(true)
      setHasSearched(true)

      try {
        const res = await fetch(
          `/api/spotify/search?q=${encodeURIComponent(debouncedQuery)}&type=track`
        )

        if (!res.ok) {
          if (res.status === 401) {
            throw new Error('Please log in to Spotify first.')
          }
          throw new Error(`Search failed: ${res.statusText}`)
        }

        const data = await res.json()
        const tracks = data.tracks?.items || []
        setResults(tracks)
      } catch (error) {
        console.error('Spotify Search Error:', error)
        enqueueSnackbar(
          error instanceof Error ? error.message : 'Failed to search Spotify',
          { variant: 'error' }
        )
        setResults([])
      } finally {
        setIsLoading(false)
      }
    }

    searchSpotify()
  }, [debouncedQuery, enqueueSnackbar])

  const handleClear = () => {
    setQuery('')
    setValue(null)
    setResults([])
    setHasSearched(false)
  }

  return (
    <Box sx={{ width: '100%', maxWidth: 600, margin: '0 auto' }}>
      <Autocomplete
        freeSolo
        disableClearable={false}
        options={results}
        getOptionLabel={(option) => {
          if (typeof option === 'string') return option
          return option.name
        }}
        filterOptions={(x) => x} // Results are already filtered by API
        loading={isLoading}
        value={value}
        inputValue={query}
        onInputChange={(_, newInputValue) => {
          setQuery(newInputValue)
          if (newInputValue === '') {
            handleClear()
          }
        }}
        onChange={(_, newValue, reason) => {
          if (reason === 'clear') {
            handleClear()
          } else if (newValue && typeof newValue !== 'string') {
            onTrackSelect?.(newValue.uri)
            // Clear on select behavior
            handleClear()
          } else {
            setValue(newValue)
          }
        }}
        slotProps={{
          clearIndicator: {
            'aria-label': 'Clear search',
            title: 'Clear search',
          },
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            placeholder="Search for a song..."
            size="small"
            variant="outlined"
            sx={{ backgroundColor: 'background.paper', borderRadius: 1 }}
            InputProps={{
              ...params.InputProps,
              startAdornment: (
                <InputAdornment position="start">
                  <Search color="action" />
                </InputAdornment>
              ),
              endAdornment: (
                <React.Fragment>
                  {isLoading ? (
                    <CircularProgress color="inherit" size={20} />
                  ) : null}
                  {params.InputProps.endAdornment}
                </React.Fragment>
              ),
            }}
          />
        )}
        renderOption={(props, track) => {
          const { key, ...otherProps } = props
          return (
            <Box component="li" key={key} {...otherProps} sx={{ px: 2, py: 1 }}>
              <ListItemAvatar sx={{ minWidth: 56 }}>
                <Avatar
                  variant="square"
                  src={
                    track.album.images[2]?.url ||
                    track.album.images[0]?.url ||
                    ''
                  }
                  alt={track.album.name}
                  sx={{ width: 40, height: 40 }}
                >
                  <MusicNote />
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={track.name}
                secondary={`${track.artists
                  .map((a) => a.name)
                  .join(', ')} • ${track.album.name}`}
                primaryTypographyProps={{
                  noWrap: true,
                  variant: 'body2',
                  fontWeight: 'bold',
                }}
                secondaryTypographyProps={{
                  noWrap: true,
                  variant: 'caption',
                }}
              />
            </Box>
          )
        }}
        noOptionsText={
          hasSearched && !isLoading && query ? (
            <Typography variant="body2" color="text.secondary">
              No results found for &quot;{query}&quot;
            </Typography>
          ) : !query ? (
            <Typography variant="body2" color="text.secondary">
              Start typing to search Spotify...
            </Typography>
          ) : null
        }
      />
    </Box>
  )
}

export default SpotifySearchInput
