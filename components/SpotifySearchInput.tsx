'use client'

import { Clear, Search, MusicNote } from '@mui/icons-material'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemAvatar from '@mui/material/ListItemAvatar'
import ListItemText from '@mui/material/ListItemText'
import Paper from '@mui/material/Paper'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
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

  // Debounce the search query by 500ms
  const debouncedQuery = useDebounce(query, 500)

  // Handle Input Change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value)
    if (e.target.value === '') {
      setResults([])
      setHasSearched(false)
    }
  }

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

  // --- Render Helpers ---

  const renderEmptyState = () => {
    if (!hasSearched && !query) {
      return (
        <Typography
          variant="body2"
          color="text.secondary"
          align="center"
          sx={{ mt: 2 }}
        >
          Start typing to search Spotify...
        </Typography>
      )
    }
    if (hasSearched && !isLoading && results.length === 0 && query) {
      return (
        <Typography
          variant="body2"
          color="text.secondary"
          align="center"
          sx={{ mt: 2 }}
        >
          No results found for &quot;{query}&quot;
        </Typography>
      )
    }
    return null
  }

  return (
    <Box sx={{ width: '100%', maxWidth: 600, margin: '0 auto' }}>
      <TextField
        fullWidth
        placeholder="Search for a song..."
        value={query}
        onChange={handleInputChange}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Search color="action" />
            </InputAdornment>
          ),
          endAdornment: (
            <InputAdornment position="end">
              {isLoading ? (
                <CircularProgress size={20} color="inherit" />
              ) : query ? (
                <IconButton onClick={handleClear} edge="end" size="small">
                  <Clear />
                </IconButton>
              ) : null}
            </InputAdornment>
          ),
        }}
        variant="outlined"
        size="small"
        sx={{ backgroundColor: 'background.paper', borderRadius: 1 }}
      />

      {/* Results or Empty State */}
      <Box sx={{ mt: 1 }}>
        {renderEmptyState()}

        {results.length > 0 && (
          <Paper elevation={3} sx={{ maxHeight: 300, overflow: 'auto' }}>
            <List dense>
              {results.map((track) => (
                <ListItem key={track.id} divider>
                  <ListItemButton
                    onClick={() => onTrackSelect && onTrackSelect(track.uri)}
                  >
                    <ListItemAvatar>
                      <Avatar
                        variant="square"
                        src={
                          track.album.images[2]?.url ||
                          track.album.images[0]?.url ||
                          ''
                        }
                        alt={track.album.name}
                      >
                        <MusicNote />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={track.name}
                      secondary={`${track.artists
                        .map((a) => a.name)
                        .join(', ')} • ${track.album.name}`}
                      primaryTypographyProps={{ noWrap: true }}
                      secondaryTypographyProps={{ noWrap: true }}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Paper>
        )}
      </Box>
    </Box>
  )
}
export default SpotifySearchInput
