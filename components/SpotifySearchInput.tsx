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
  Typography,
} from '@mui/material'
import { useSnackbar } from 'notistack'
import { useEffect, useState } from 'react'
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

  const debouncedQuery = useDebounce(query, 500)

  const handleClear = () => {
    setQuery('')
    setResults([])
    setHasSearched(false)
  }

  useEffect(() => {
    const searchSpotify = async () => {
      if (!debouncedQuery.trim()) return

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

  return (
    <Box sx={{ width: '100%', maxWidth: 600, margin: '0 auto' }}>
      <Autocomplete
        fullWidth
        options={results}
        getOptionLabel={(option) =>
          typeof option === 'string' ? option : option.name
        }
        filterOptions={(x) => x}
        autoComplete
        includeInputInList
        filterSelectedOptions
        value={null}
        inputValue={query}
        forcePopupIcon={false}
        noOptionsText={isLoading ? 'Searching...' : 'No songs found'}
        onChange={(_event, newValue: SpotifyTrack | null) => {
          if (newValue && onTrackSelect) {
            onTrackSelect(newValue.uri)
            handleClear()
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
      <Box sx={{ mt: 1 }}>
        {!hasSearched && !query && (
          <Typography
            variant="body2"
            color="text.secondary"
            align="center"
            sx={{ mt: 2 }}
          >
            Start typing to search Spotify...
          </Typography>
        )}
      </Box>
    </Box>
  )
}
export default SpotifySearchInput
