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

  const debouncedQuery = useDebounce(query, 500)

  useEffect(() => {
    let active = true
    if (!debouncedQuery.trim()) {
      Promise.resolve().then(() => {
        if (active) {
          setResults([])
          setHasSearched(false)
        }
      })
      return
    }
    Promise.resolve().then(() => {
      if (active) {
        setIsLoading(true)
        setHasSearched(true)
      }
    })
    fetch(
      `/api/spotify/search?q=${encodeURIComponent(debouncedQuery)}&type=track`
    )
      .then((res) =>
        res.ok
          ? res.json()
          : Promise.reject(
              res.status === 401 ? 'Log in to Spotify' : 'Search failed'
            )
      )
      .then((data) => active && setResults(data.tracks?.items || []))
      .catch((err) => {
        if (active) {
          enqueueSnackbar(String(err), { variant: 'error' })
          setResults([])
        }
      })
      .finally(() => active && setIsLoading(false))
    return () => {
      active = false
    }
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
          if (
            reason === 'clear' ||
            (newValue && typeof newValue !== 'string')
          ) {
            if (typeof newValue !== 'string' && newValue) {
              onTrackSelect?.(newValue.uri)
            }
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
        renderOption={({ key, ...props }, track) => (
          <Box component="li" key={key} {...props} sx={{ px: 2, py: 1 }}>
            <ListItemAvatar sx={{ minWidth: 56 }}>
              <Avatar
                variant="square"
                src={
                  track.album.images[2]?.url || track.album.images[0]?.url || ''
                }
                sx={{ width: 40, height: 40 }}
              >
                <MusicNote />
              </Avatar>
            </ListItemAvatar>
            <ListItemText
              primary={track.name}
              secondary={`${track.artists.map((a) => a.name).join(', ')} • ${track.album.name}`}
              primaryTypographyProps={{
                noWrap: true,
                variant: 'body2',
                fontWeight: 'bold',
              }}
              secondaryTypographyProps={{ noWrap: true, variant: 'caption' }}
            />
          </Box>
        )}
        noOptionsText={
          hasSearched && !isLoading
            ? `No results for "${query}"`
            : !query
              ? 'Start typing to search...'
              : null
        }
      />
    </Box>
  )
}

export default SpotifySearchInput
