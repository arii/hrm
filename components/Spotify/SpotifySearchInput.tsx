// File: components/Spotify/SpotifySearchInput.tsx
'use client'

import { useState, useEffect } from 'react'
import { useSpotifySearch } from '@/hooks/useSpotifySearch'
import { useDebounce } from '@/hooks/useDebounce'
import { Track } from '@spotify/web-api-ts-sdk'
import Box from '@mui/material/Box'
import TextField from '@mui/material/TextField'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import CircularProgress from '@mui/material/CircularProgress'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
import ClearIcon from '@mui/icons-material/Clear'

interface SpotifySearchInputProps {
  onTrackSelected: (trackUri: string) => void
}

export const SpotifySearchInput = ({ onTrackSelected }: SpotifySearchInputProps) => {
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounce(query, 500)
  const { results, loading, error, searchTracks, clearSearch } = useSpotifySearch()

  useEffect(() => {
    searchTracks(debouncedQuery)
  }, [debouncedQuery, searchTracks])

  const handleClear = () => {
    setQuery('')
    clearSearch()
  }

  return (
    <Box sx={{ position: 'relative', width: '100%' }}>
      <TextField
        fullWidth
        variant="outlined"
        placeholder="Search for a track..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              {loading ? (
                <CircularProgress size={20} />
              ) : (
                query && (
                  <IconButton onClick={handleClear} edge="end" aria-label="clear search">
                    <ClearIcon />
                  </IconButton>
                )
              )}
            </InputAdornment>
          ),
        }}
      />
      {(results.length > 0 || error || (debouncedQuery && !loading && results.length === 0)) && (
        <Paper
          sx={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 1,
            mt: 1,
            maxHeight: 300,
            overflowY: 'auto',
          }}
        >
          {error && (
            <Typography color="error" sx={{ p: 2 }}>
              {error}
            </Typography>
          )}
          {results.length > 0 && (
            <List>
              {results.map((track) => (
                <ListItem
                  button
                  key={track.id}
                  onClick={() => onTrackSelected(track.uri)}
                >
                  <ListItemText primary={track.name} secondary={track.artists.map((a) => a.name).join(', ')} />
                </ListItem>
              ))}
            </List>
          )}
          {debouncedQuery && !loading && results.length === 0 && !error && (
            <Typography sx={{ p: 2 }}>No results found.</Typography>
          )}
        </Paper>
      )}
    </Box>
  )
}
