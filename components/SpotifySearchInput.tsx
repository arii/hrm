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
import { useEffect, useReducer, useState } from 'react'
import { useDebounce } from '@/hooks/useDebounce'

interface SpotifyTrack {
  id: string
  name: string
  artists: { name: string }[]
  album: { images: { url: string }[]; name: string }
  uri: string
}

interface SearchState {
  results: SpotifyTrack[]
  loading: boolean
  hasSearched: boolean
}

const SpotifySearchInput = ({
  onTrackSelect,
}: {
  onTrackSelect?: (uri: string) => void
}) => {
  const [query, setQuery] = useState('')
  const [value, setValue] = useState<SpotifyTrack | string | null>(null)
  const [state, dispatch] = useReducer(
    (s: SearchState, a: Partial<SearchState>) => ({ ...s, ...a }),
    { results: [], loading: false, hasSearched: false }
  )
  const { enqueueSnackbar } = useSnackbar()
  const debouncedQuery = useDebounce(query, 500)

  useEffect(() => {
    let active = true
    const searchTracks = async () => {
      if (!debouncedQuery.trim()) {
        dispatch({ results: [], hasSearched: false })
        return
      }

      dispatch({ loading: true, hasSearched: true })
      try {
        const res = await fetch(
          `/api/spotify/search?q=${encodeURIComponent(debouncedQuery)}&type=track`
        )
        if (!active) return

        if (!res.ok) {
          throw new Error(
            res.status === 401 ? 'Login required' : 'Search failed'
          )
        }

        const data = await res.json()
        if (active) dispatch({ results: data.tracks?.items || [] })
      } catch (err) {
        if (active) {
          enqueueSnackbar(String(err), { variant: 'error' })
          dispatch({ results: [] })
        }
      } finally {
        if (active) dispatch({ loading: false })
      }
    }

    searchTracks()
    return () => {
      active = false
    }
  }, [debouncedQuery, enqueueSnackbar])

  const handleClear = () => {
    setQuery('')
    setValue(null)
    dispatch({ results: [], hasSearched: false })
  }

  return (
    <Box sx={{ width: '100%', maxWidth: 600, mx: 'auto' }}>
      <Autocomplete
        freeSolo
        options={state.results}
        getOptionLabel={(o) => (typeof o === 'string' ? o : o.name)}
        filterOptions={(x) => x}
        loading={state.loading}
        value={value}
        inputValue={query}
        onInputChange={(_, val) => (val ? setQuery(val) : handleClear())}
        onChange={(_, newValue, reason) => {
          if (reason === 'clear') {
            handleClear()
          } else if (newValue && typeof newValue !== 'string') {
            onTrackSelect?.(newValue.uri)
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
            sx={{ backgroundColor: 'background.paper', borderRadius: 1 }}
            InputProps={{
              ...params.InputProps,
              startAdornment: (
                <InputAdornment position="start">
                  <Search color="action" />
                </InputAdornment>
              ),
              endAdornment: (
                <>
                  {state.loading && (
                    <CircularProgress color="inherit" size={20} />
                  )}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
          />
        )}
        renderOption={({ key, ...props }, track) => (
          <Box component="li" key={key} {...props} sx={{ px: 2, py: 1 }}>
            <ListItemAvatar sx={{ minWidth: 56 }}>
              <Avatar
                variant="square"
                src={track.album.images[2]?.url || ''}
                alt={track.name}
                sx={{ width: 40, height: 40 }}
              >
                <MusicNote />
              </Avatar>
            </ListItemAvatar>
            <ListItemText
              primary={track.name}
              secondary={`${track.artists[0]?.name || 'Unknown Artist'} • ${track.album.name}`}
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
          state.hasSearched && !state.loading
            ? `No results for "${query}"`
            : !query
              ? 'Type to search...'
              : null
        }
      />
    </Box>
  )
}

export default SpotifySearchInput
