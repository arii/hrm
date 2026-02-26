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
import { useEffect, useState } from 'react'
import { useDebounce } from '@/hooks/useDebounce'

interface SpotifyTrack {
  id: string
  name: string
  artists: { name: string }[]
  album: { images: { url: string }[]; name: string }
  uri: string
}

const SpotifySearchInput = ({
  onTrackSelect,
}: {
  onTrackSelect?: (uri: string) => void
}) => {
  const [query, setQuery] = useState('')
  const [value, setValue] = useState<SpotifyTrack | null>(null)
  const [results, setResults] = useState<SpotifyTrack[]>([])
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  const { enqueueSnackbar } = useSnackbar()
  const debouncedQuery = useDebounce(query, 500)

  useEffect(() => {
    let active = true
    const searchTracks = async () => {
      if (!debouncedQuery.trim()) {
        setResults([])
        setHasSearched(false)
        return
      }

      setLoading(true)
      setHasSearched(true)
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
        if (active) setResults(data.tracks?.items || [])
      } catch (err) {
        if (active) {
          enqueueSnackbar(String(err), { variant: 'error' })
          setResults([])
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    searchTracks()
    return () => {
      active = false
    }
  }, [debouncedQuery, enqueueSnackbar])

  const handleClear = () => {
    setQuery('')
    setResults([])
    setHasSearched(false)
    setValue(null)
    setResults([])
    setHasSearched(false)
  }

  return (
    <Box sx={{ width: '100%', maxWidth: 600, mx: 'auto' }}>
      <Autocomplete
        options={results}
        getOptionLabel={(o) => o.name}
        filterOptions={(x) => x}
        loading={loading}
        value={value}
        inputValue={query}
        onInputChange={(_, val) => setQuery(val)}
        onChange={(_, newValue, reason) => {
          if (reason === 'clear') {
            handleClear()
          } else if (newValue) {
            onTrackSelect?.(newValue.uri)
            handleClear()
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
                  {loading && <CircularProgress color="inherit" size={20} />}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
          />
        )}
        renderOption={(props, track) => {
          const { key, ...liProps } = props
          return (
            <Box component="li" key={key} {...liProps} sx={{ px: 2, py: 1 }}>
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
                secondary={`${track.artists.map((a) => a.name).join(', ')} • ${track.album.name}`}
                primaryTypographyProps={{
                  noWrap: true,
                  variant: 'body2',
                  fontWeight: 'bold',
                }}
                secondaryTypographyProps={{ noWrap: true, variant: 'caption' }}
              />
            </Box>
          )
        }}
        noOptionsText={
          hasSearched && !loading
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
