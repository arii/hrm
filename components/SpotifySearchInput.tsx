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
    if (!debouncedQuery.trim()) {
      dispatch({ results: [], hasSearched: false })
      return
    }
    dispatch({ loading: true, hasSearched: true })
    fetch(
      `/api/spotify/search?q=${encodeURIComponent(debouncedQuery)}&type=track`
    )
      .then((res) =>
        res.ok
          ? res.json()
          : Promise.reject(res.status === 401 ? 'Login' : 'Err')
      )
      .then((data) => active && dispatch({ results: data.tracks?.items || [] }))
      .catch(
        (err) =>
          active &&
          (enqueueSnackbar(String(err), { variant: 'error' }),
          dispatch({ results: [] }))
      )
      .finally(() => active && dispatch({ loading: false }))
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
        onChange={(_, val, reason) => {
          if (reason === 'clear' || (val && typeof val !== 'string')) {
            if (typeof val !== 'string' && val) onTrackSelect?.(val.uri)
            handleClear()
          } else setValue(val)
        }}
        slotProps={{
          clearIndicator: { 'aria-label': 'Clear', title: 'Clear' },
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
                sx={{ width: 40, height: 40 }}
              >
                <MusicNote />
              </Avatar>
            </ListItemAvatar>
            <ListItemText
              primary={track.name}
              secondary={`${track.artists[0]?.name} • ${track.album.name}`}
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
