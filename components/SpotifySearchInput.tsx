'use client'

import { Search, MusicNote } from '@mui/icons-material'
import {
  Autocomplete,
  Avatar,
  Box,
  CircularProgress,
  InputAdornment,
  ListItemText,
  TextField,
} from '@mui/material'
import { useSnackbar } from 'notistack'
import { useEffect, useState, useMemo } from 'react'
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
  const [results, setResults] = useState<SpotifyTrack[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const { enqueueSnackbar } = useSnackbar()

  // Debounce the search query by 500ms
  const debouncedQuery = useDebounce(query, 500)

  // Handle Clear
  const handleClear = () => {
    setQuery('')
    setResults([])
    setHasSearched(false)
  }

  // Effect to trigger search when debounced query changes
  useEffect(() => {
    const searchSpotify = async () => {
      if (!debouncedQuery.trim()) return

      setIsLoading(true)
      setHasSearched(true) // Mark that a search has been attempted

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

  return (
    <Box sx={{ width: '100%', maxWidth: 600, margin: '0 auto' }}>
      <Autocomplete
        fullWidth
        options={results}
        getOptionLabel={(option) =>
          typeof option === 'string' ? option : option.name
        }
        filterOptions={(x) => x} // Disable built-in filtering, we use API
        autoComplete
        includeInputInList
        filterSelectedOptions
        value={null}
        inputValue={query}
        noOptionsText={
          isLoading
            ? 'Searching...'
            : hasSearched
              ? 'No songs found'
              : 'Start typing to search Spotify...'
        }
        onChange={(_event, newValue: SpotifyTrack | null) => {
          if (newValue && onTrackSelect) {
            onTrackSelect(newValue.uri)
            handleClear() // Clear search on select as suggested
          }
        }}
        onInputChange={(_event, newInputValue, reason) => {
          if (reason === 'input') {
            setQuery(newInputValue)
            if (newInputValue === '') {
              setResults([])
              setHasSearched(false)
            }
          } else if (reason === 'clear') {
            handleClear()
          }
          // Ignore 'reset' reason (selection or blur) to avoid redundant searches
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
                <>
                  {isLoading ? (
                    <CircularProgress color="inherit" size={20} />
                  ) : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
          />
        )}
        renderOption={(props, track) => {
          const { key, ...otherProps } = props
          return (
            <Box
              component="li"
              key={key || track.id}
              {...otherProps}
              sx={{
                display: 'flex',
                alignItems: 'center',
                px: 2,
                py: 1,
                borderBottom: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Avatar
                variant="square"
                src={
                  track.album.images[2]?.url || track.album.images[0]?.url || ''
                }
                alt={track.album.name}
                sx={{ width: 32, height: 32, mr: 2, borderRadius: 0.5 }}
              >
                <MusicNote />
              </Avatar>
              <ListItemText
                primary={track.name}
                secondary={`${track.artists
                  .map((a) => a.name)
                  .join(', ')} • ${track.album.name}`}
                primaryTypographyProps={{ noWrap: true, variant: 'body2' }}
                secondaryTypographyProps={{ noWrap: true, variant: 'caption' }}
              />
            </Box>
          )
        }}
      />
    </Box>
  )
}
export default SpotifySearchInput
