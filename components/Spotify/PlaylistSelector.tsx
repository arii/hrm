// components/Spotify/PlaylistSelector.tsx
import ClearIcon from '@mui/icons-material/Clear'
import MusicNote from '@mui/icons-material/MusicNote'
import PlayArrow from '@mui/icons-material/PlayArrow'
import Search from '@mui/icons-material/Search'
import Alert from '@mui/material/Alert'
import Autocomplete from '@mui/material/Autocomplete'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import IconButton from '@mui/material/IconButton'
import ListItemText from '@mui/material/ListItemText'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import React, { useEffect, useMemo, useState } from 'react'
import { ListChildComponentProps, VariableSizeList } from 'react-window'
import { useDebounce } from '../../hooks/useDebounce'
import { API_SPOTIFY_PLAYLISTS } from '../../constants/apiEndpoints'
import { Playlist } from '../../types/spotify'

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
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(
    null
  )

  const debouncedSearch = useDebounce(searchQuery, 500)

  useEffect(() => {
    const fetchPlaylists = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch(API_SPOTIFY_PLAYLISTS)
        if (!response.ok) {
          throw new Error('Failed to fetch playlists')
        }
        const data = await response.json()
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
        const message =
          error instanceof Error ? error.message : 'Failed to fetch playlists'
        setError(message)
        console.error('Error fetching playlists:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchPlaylists()
  }, [])

  useEffect(() => {
    if (!debouncedSearch.trim()) {
      setSearchResults([])
      return
    }

    const fetchSearchResults = async () => {
      setSearchLoading(true)
      try {
        const response = await fetch(
          `/api/spotify/playlists/search?q=${encodeURIComponent(
            debouncedSearch
          )}`
        )
        if (!response.ok) {
          throw new Error('Failed to search playlists')
        }
        const data = await response.json()
        setSearchResults(data.items || [])
      } catch (error) {
        console.error('Error searching playlists:', error)
        setSearchResults([])
      } finally {
        setSearchLoading(false)
      }
    }

    fetchSearchResults()
  }, [debouncedSearch])

  const allPlaylists = useMemo(() => {
    return [...presetPlaylists, ...userPlaylists]
  }, [presetPlaylists, userPlaylists])

  const filteredPlaylists = useMemo(() => {
    const query = debouncedSearch.toLowerCase().trim()
    if (!query) {
      return allPlaylists
    }

    const localMatches = allPlaylists.filter((playlist) =>
      playlist.name.toLowerCase().includes(query)
    )

    const combined = [...localMatches]
    const existingUris = new Set(localMatches.map((p) => p.uri))

    searchResults.forEach((playlist) => {
      if (!existingUris.has(playlist.uri)) {
        combined.push({ ...playlist, isSearchResult: true })
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

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
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
            {...params}
            placeholder="Search or browse playlists..."
            InputProps={{
              ...params.InputProps,
              startAdornment: (
                <Search sx={{ color: 'text.secondary', mr: 1 }} />
              ),
              endAdornment: (
                <>
                  {searchLoading ? (
                    <CircularProgress size={20} />
                  ) : searchQuery ? (
                    <IconButton
                      size="small"
                      onClick={() => setSearchQuery('')}
                      aria-label="Clear search"
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
        renderOption={(props, option) => {
          // Destructure key out to satisfy React 19/MUI requirements
          const { key, ...otherProps } = props
          return (
            <Box
              key={key}
              component="li"
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                width: '100%',
                py: 0.5,
                // Use Autocomplete's hover state for background color
                '&[aria-selected="true"]': {
                  backgroundColor: 'action.hover',
                  outline: (theme) => `2px solid ${theme.palette.primary.main}`,
                  outlineOffset: '-2px',
                },
                '&:hover': {
                  backgroundColor: 'action.hover',
                },
              }}
              {...otherProps}
              // Add aria-label for screen reader accessibility.
              // This ensures that screen readers announce both the action and the playlist name.
              aria-label={`Select playlist: ${option.name}, ${
                selectedPlaylist?.uri === option.uri
                  ? 'selected'
                  : 'not selected'
              }`}
            >
              <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}>
                {option.imageUrl ? (
                  <Box
                    component="img"
                    src={option.imageUrl}
                    alt={option.name}
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 1,
                      mr: 1.5,
                      objectFit: 'cover',
                    }}
                  />
                ) : (
                  <MusicNote
                    sx={{ mr: 1.5, color: 'text.secondary', fontSize: 24 }}
                  />
                )}
                <ListItemText
                  primary={option.name}
                  secondary={
                    option.trackCount !== undefined
                      ? `${option.trackCount} tracks${
                          option.owner ? ` • ${option.owner}` : ''
                        }`
                      : option.owner
                        ? option.owner
                        : undefined
                  }
                />
                {option.isPreset && (
                  <Chip
                    label="Preset"
                    size="small"
                    sx={{ height: 20, fontSize: '0.7rem', ml: 1 }}
                  />
                )}
                {option.isSearchResult && !option.isPreset && (
                  <Chip
                    label="Spotify"
                    size="small"
                    color="success"
                    sx={{ height: 20, fontSize: '0.7rem', ml: 1 }}
                  />
                )}
              </Box>
              <Box sx={{ pl: 1, display: 'flex', alignItems: 'center' }}>
                <IconButton
                  edge="end"
                  aria-label={`Play playlist: ${option.name}`}
                  onClick={(e) => {
                    // Prevent the click from propagating to the Autocomplete component,
                    // which would otherwise close the dropdown.
                    e.stopPropagation()
                    onPlaylistPlay(option.uri)
                  }}
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
            </Box>
          )
        }}
        groupBy={(option) => {
          if (option.isSearchResult) return 'Spotify Results'
          if (option.isPreset) return 'Preset Playlists'
          return 'Your Playlists'
        }}
        noOptionsText={
          debouncedSearch ? (
            // eslint-disable-next-line react/no-unescaped-entities
            <>No playlists found matching "{debouncedSearch}"</>
          ) : (
            'No playlists available'
          )
        }
        sx={{ mb: 2 }}
        ListboxComponent={
          ListboxComponent as React.ComponentType<React.HTMLAttributes<HTMLElement>>
        }
      />
    </Box>
  )
}

const LISTBOX_PADDING = 8 // px

function renderRow(props: ListChildComponentProps) {
  const { data, index, style } = props
  const dataSet = data[index]
  const inlineStyle = {
    ...style,
    top: (style.top as number) + LISTBOX_PADDING,
  }

  return React.cloneElement(dataSet, {
    style: inlineStyle,
  })
}

const OuterElementContext = React.createContext({})

const OuterElementType = React.forwardRef<HTMLDivElement>((props, ref) => {
  const outerProps = React.useContext(OuterElementContext)
  return <div ref={ref} {...props} {...outerProps} />
})

const ITEM_SIZE = 56 // Estimated height for playlist items
const GROUP_HEADER_SIZE = 36 // Estimated height for group headers

const ListboxComponent = React.forwardRef<HTMLDivElement>(
  function ListboxComponent(props, ref) {
    const { children, ...other } = props
    const itemData = React.Children.toArray(children)
    const itemCount = itemData.length
    const listRef = React.useRef<VariableSizeList>(null)

    React.useEffect(() => {
      if (listRef.current) {
        listRef.current.resetAfterIndex(0)
      }
    }, [itemData])

    const getItemSize = (index: number) => {
      const item = itemData[index] as React.ReactElement
      // NOTE: This relies on an internal MUI class name.
      // This is a common workaround for virtualizing MUI Autocomplete,
      // but it might break if MUI changes its internal class structure.
      if (item.props.className?.includes('MuiAutocomplete-groupLabel')) {
        return GROUP_HEADER_SIZE
      }
      return ITEM_SIZE
    }

    const getHeight = () => {
      const maxHeight = 8 * ITEM_SIZE
      let calculatedHeight = 0
      for (let i = 0; i < itemCount; i++) {
        calculatedHeight += getItemSize(i)
      }
      return Math.min(calculatedHeight, maxHeight)
    }

    if (itemCount === 0) {
      return null
    }

    return (
      <div ref={ref}>
        <OuterElementContext.Provider value={other}>
          <VariableSizeList
            itemData={itemData}
            height={getHeight() + 2 * LISTBOX_PADDING}
            width="100%"
            ref={listRef}
            outerElementType={OuterElementType}
            innerElementType="ul"
            itemSize={getItemSize}
            overscanCount={5}
            itemCount={itemCount}
          >
            {renderRow}
          </VariableSizeList>
        </OuterElementContext.Provider>
      </div>
    )
  }
)

export default PlaylistSelector
