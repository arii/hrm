// components/Spotify/PlaylistSelector.tsx
import ClearIcon from '@mui/icons-material/Clear'
import MusicNote from '@mui/icons-material/MusicNote'
import PlayArrow from '@mui/icons-material/PlayArrow'
import Search from '@mui/icons-material/Search'
import Autocomplete from '@mui/material/Autocomplete'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import Paper from '@mui/material/Paper'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import React, { useEffect, useMemo, useState } from 'react'
import { useDebounce } from '../../hooks/useDebounce'
import { API_SPOTIFY_PLAYLISTS } from '../../constants/apiEndpoints'
import { useError } from '@/context/ErrorContext'

interface PlaylistItemProps {
  playlist: Playlist
  selected: boolean
  onClick: () => void
  onPlay: (event: React.MouseEvent<HTMLElement>) => void
}

const PlaylistItem: React.FC<PlaylistItemProps> = ({
  playlist,
  selected,
  onClick,
  onPlay,
}) => (
  <ListItem
    key={playlist.uri}
    divider
    sx={{ display: 'flex', justifyContent: 'space-between' }}
  >
    <ListItemButton
      selected={selected}
      onClick={onClick}
      sx={{
        flexGrow: 1,
        '&:hover': {
          backgroundColor: 'action.hover',
        },
      }}
    >
      {playlist.imageUrl ? (
        <Box
          component="img"
          src={playlist.imageUrl}
          alt={playlist.name}
          sx={{
            width: 48,
            height: 48,
            borderRadius: 1,
            mr: 1.5,
            objectFit: 'cover',
          }}
        />
      ) : (
        <MusicNote sx={{ mr: 1.5, color: 'text.secondary', fontSize: 24 }} />
      )}
      <ListItemText
        primary={playlist.name}
        secondary={
          playlist.trackCount !== undefined
            ? `${playlist.trackCount} tracks${playlist.owner ? ` • ${playlist.owner}` : ''}`
            : playlist.owner
              ? playlist.owner
              : undefined
        }
      />
      {playlist.isPreset && (
        <Chip
          label="Preset"
          size="small"
          sx={{ height: 20, fontSize: '0.7rem', ml: 1 }}
        />
      )}
      {playlist.isSearchResult && !playlist.isPreset && (
        <Chip
          label="Spotify"
          size="small"
          color="success"
          sx={{ height: 20, fontSize: '0.7rem', ml: 1 }}
        />
      )}
    </ListItemButton>
    <Box sx={{ pl: 1 }}>
      <IconButton
        edge="end"
        aria-label="play"
        onClick={onPlay}
        sx={{
          '&:hover': {
            backgroundColor: 'action.hover',
            transform: 'scale(1.1)',
          },
        }}
      >
        <PlayArrow />
      </IconButton>
    </Box>
  </ListItem>
)

interface Playlist {
  name: string
  uri: string
  id?: string
  isPreset?: boolean
  isSearchResult?: boolean
  imageUrl?: string | null
  description?: string | null
  trackCount?: number
  owner?: string
}

interface PlaylistSelectorProps {
  onPlaylistSelected: (uri: string) => void
  onPlaylistPlay: (uri: string) => void
}

const PlaylistSelector: React.FC<PlaylistSelectorProps> = ({
  onPlaylistSelected,
  onPlaylistPlay,
}) => {
  const [presetPlaylists, setPresetPlaylists] = useState<Playlist[]>([])
  const [userPlaylists, setUserPlaylists] = useState<Playlist[]>([])
  const [searchResults, setSearchResults] = useState<Playlist[]>([])
  const [loading, setLoading] = useState(true)
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(
    null
  )
  const { addError } = useError()

  const debouncedSearch = useDebounce(searchQuery, 500)

  useEffect(() => {
    const fetchPlaylists = async () => {
      setLoading(true)
      try {
        const response = await fetch(API_SPOTIFY_PLAYLISTS)
        if (!response.ok) {
          throw new Error('Failed to fetch playlists')
        }
        const data = await response.json()
        console.log('--- TEST DATA ---', JSON.stringify(data))
        const presets = (data.presetPlaylists || []).map((p: Playlist) => ({
          ...p,
          isPreset: true,
        }))
        const user = (data.userPlaylists || []).map((p: Playlist) => ({
          ...p,
          isPreset: false,
        }))
        setPresetPlaylists(presets)
        setUserPlaylists(user)
      } catch (error) {
        console.error('Error fetching playlists:', error)
        addError('Failed to fetch playlists. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    fetchPlaylists()
  }, [addError])

  // Fetch search results when user types
  useEffect(() => {
    if (!debouncedSearch.trim()) {
      setSearchResults([])
      return
    }

    const fetchSearchResults = async () => {
      setSearchLoading(true)
      try {
        const response = await fetch(
          `/api/spotify/playlists/search?q=${encodeURIComponent(debouncedSearch)}`
        )
        if (!response.ok) {
          throw new Error('Failed to search playlists')
        }
        const data = await response.json()
        setSearchResults(data.items || [])
      } catch (error) {
        console.error('Error searching playlists:', error)
        addError('Failed to search playlists. Please try again.')
        setSearchResults([])
      } finally {
        setSearchLoading(false)
      }
    }

    fetchSearchResults()
  }, [debouncedSearch, addError])

  const allPlaylists = useMemo(() => {
    return [...presetPlaylists, ...userPlaylists]
  }, [presetPlaylists, userPlaylists])

  const filteredPlaylists = useMemo(() => {
    if (!debouncedSearch.trim()) {
      return allPlaylists
    }

    // When searching, combine local matches with Spotify search results
    const query = debouncedSearch.toLowerCase()
    const localMatches = allPlaylists.filter((playlist) =>
      playlist.name.toLowerCase().includes(query)
    )

    // Combine local matches with search results, removing duplicates by URI
    const combined = [...localMatches]
    const existingUris = new Set(localMatches.map((p) => p.uri))

    searchResults.forEach((playlist) => {
      if (!existingUris.has(playlist.uri)) {
        combined.push(playlist)
      }
    })

    return combined
  }, [allPlaylists, debouncedSearch, searchResults])

  const handlePlaylistSelect = (playlist: Playlist | null) => {
    setSelectedPlaylist(playlist)
    if (playlist) {
      onPlaylistSelected(playlist.uri)
    }
  }

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          py: 4,
        }}
      >
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading playlists...</Typography>
      </Box>
    )
  }

  return (
    <Box>
      <Autocomplete
        options={filteredPlaylists}
        getOptionLabel={(option) => option.name}
        value={selectedPlaylist}
        onChange={(_, newValue) => handlePlaylistSelect(newValue)}
        inputValue={searchQuery}
        onInputChange={(_, newInputValue) => setSearchQuery(newInputValue)}
        renderInput={(params) => (
          <TextField
            id={params.id}
            disabled={params.disabled}
            fullWidth={params.fullWidth}
            inputProps={params.inputProps}
            placeholder="Search or browse playlists..."
            sx={{
              '& .MuiOutlinedInput-root': {
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'primary.main',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'primary.main',
                  boxShadow: `0 0 0 2px rgba(25, 118, 210, 0.2)`,
                },
              },
            }}
            InputProps={{
              ref: params.InputProps.ref,
              className: params.InputProps.className,
              startAdornment: (
                <Search sx={{ color: 'text.secondary', mr: 1 }} />
              ),
              endAdornment: (
                <>
                  {searchLoading ? (
                    <CircularProgress size={20} sx={{ mr: 1 }} />
                  ) : searchQuery ? (
                    <IconButton
                      size="small"
                      onClick={() => setSearchQuery('')}
                      aria-label="Clear search"
                      sx={{ mr: 1 }}
                    >
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  ) : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
          />
        )}
        renderOption={(_props, option) => (
          <PlaylistItem
            key={option.uri}
            playlist={option}
            selected={selectedPlaylist?.uri === option.uri}
            onClick={() => handlePlaylistSelect(option)}
            onPlay={(e) => {
              e.stopPropagation()
              onPlaylistPlay(option.uri)
            }}
          />
        )}
        noOptionsText={
          debouncedSearch ? (
            // eslint-disable-next-line react/no-unescaped-entities
            <>No playlists found matching "{debouncedSearch}"</>
          ) : (
            'No playlists available'
          )
        }
        sx={{ mb: 2 }}
      />

      {!searchQuery && (
        <Paper variant="outlined" sx={{ maxHeight: 300, overflow: 'auto' }}>
          <List dense>
            {presetPlaylists.length > 0 && (
              <>
                <ListItem>
                  <ListItemText
                    primary={
                      <Typography variant="overline" color="text.secondary">
                        Preset Playlists
                      </Typography>
                    }
                  />
                </ListItem>
                {presetPlaylists.map((playlist) => (
                  <PlaylistItem
                    key={playlist.uri}
                    playlist={playlist}
                    selected={selectedPlaylist?.uri === playlist.uri}
                    onClick={() => handlePlaylistSelect(playlist)}
                    onPlay={(e) => {
                      e.stopPropagation()
                      onPlaylistPlay(playlist.uri)
                    }}
                  />
                ))}
                {userPlaylists.length > 0 && <Divider sx={{ my: 1 }} />}
              </>
            )}
            {userPlaylists.length > 0 && (
              <>
                <ListItem>
                  <ListItemText
                    primary={
                      <Typography variant="overline" color="text.secondary">
                        Your Playlists ({userPlaylists.length})
                      </Typography>
                    }
                  />
                </ListItem>
                {userPlaylists.map((playlist) => (
                  <PlaylistItem
                    key={playlist.uri}
                    playlist={playlist}
                    selected={selectedPlaylist?.uri === playlist.uri}
                    onClick={() => handlePlaylistSelect(playlist)}
                    onPlay={(e) => {
                      e.stopPropagation()
                      onPlaylistPlay(playlist.uri)
                    }}
                  />
                ))}
              </>
            )}
          </List>
        </Paper>
      )}

      {searchQuery && (
        <Paper
          variant="outlined"
          sx={{ maxHeight: 300, overflow: 'auto', mt: 1 }}
        >
          {searchLoading ? (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                py: 3,
              }}
            >
              <CircularProgress size={24} />
              <Typography sx={{ ml: 2 }} variant="body2" color="text.secondary">
                Searching Spotify...
              </Typography>
            </Box>
          ) : filteredPlaylists.length > 0 ? (
            <List dense>
              {filteredPlaylists.map((playlist) => (
                <PlaylistItem
                  key={playlist.uri}
                  playlist={playlist}
                  selected={selectedPlaylist?.uri === playlist.uri}
                  onClick={() => handlePlaylistSelect(playlist)}
                  onPlay={(e) => {
                    e.stopPropagation()
                    onPlaylistPlay(playlist.uri)
                  }}
                />
              ))}
            </List>
          ) : (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                {/* eslint-disable-next-line react/no-unescaped-entities */}
                No playlists found matching "{searchQuery}"
              </Typography>
            </Box>
          )}
        </Paper>
      )}
    </Box>
  )
}

export default PlaylistSelector
