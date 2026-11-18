// components/Spotify/PlaylistQuickGrid.tsx
import MusicNote from '@mui/icons-material/MusicNote'
import QueueMusic from '@mui/icons-material/QueueMusic'
import Search from '@mui/icons-material/Search'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import ButtonBase from '@mui/material/ButtonBase'
import CircularProgress from '@mui/material/CircularProgress'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useEffect, useMemo, useState } from 'react'
import logger from '@/utils/logger'
import { withBasePath } from '@/utils/urls'
import { useDebounce } from '@/hooks/useDebounce'
import { API_SPOTIFY_PLAYLISTS } from '@/constants/apiEndpoints'
import type { SpotifyPlaylist as Playlist } from '@/types/core'

interface PlaylistQuickGridProps {
  /** One tap on a tile: play the whole playlist. */
  onPlaylistPlay: (uri: string) => void
  /** The tile's Tracks button: open the track list to pick a start track. */
  onShowTracks: (uri: string) => void
  /** URI of the playlist whose tracks are open, for the selected outline. */
  openUri?: string | null
}

const SEARCH_DEBOUNCE_MS = 500

const subtitle = (playlist: Playlist) => {
  if (playlist.isPreset) return 'Preset'
  if (playlist.trackCount !== undefined) {
    return `${playlist.trackCount} tracks${playlist.owner ? ` · ${playlist.owner}` : ''}`
  }
  return playlist.owner ?? ''
}

const PlaylistTile = ({
  playlist,
  onPlay,
  onShowTracks,
  open,
}: {
  playlist: Playlist
  onPlay: () => void
  onShowTracks: () => void
  open: boolean
}) => (
  <Box
    data-testid="playlist-tile"
    sx={{
      position: 'relative',
      borderRadius: 2,
      bgcolor: 'background.paper',
      boxShadow: 1,
      outline: open ? 2 : 0,
      outlineColor: 'primary.main',
      overflow: 'hidden',
    }}
  >
    <ButtonBase
      focusRipple
      onClick={onPlay}
      aria-label={`Play playlist: ${playlist.name}`}
      sx={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        textAlign: 'left',
        minHeight: 44,
      }}
    >
      {playlist.imageUrl ? (
        <Box
          component="img"
          src={playlist.imageUrl}
          alt=""
          sx={{ width: '100%', aspectRatio: '1', objectFit: 'cover' }}
        />
      ) : (
        <Box
          sx={{
            width: '100%',
            aspectRatio: '1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'action.hover',
          }}
        >
          <MusicNote sx={{ fontSize: 48, color: 'text.secondary' }} />
        </Box>
      )}
      <Box sx={{ p: 1, pr: 6 }}>
        <Typography variant="body1" sx={{ fontWeight: 700 }} noWrap>
          {playlist.name}
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          display="block"
          noWrap
        >
          {subtitle(playlist) || '\u00a0'}
        </Typography>
      </Box>
    </ButtonBase>
    <IconButton
      onClick={onShowTracks}
      aria-label={`Show tracks: ${playlist.name}`}
      aria-pressed={open}
      sx={{ position: 'absolute', right: 2, bottom: 2, width: 44, height: 44 }}
    >
      <QueueMusic />
    </IconButton>
  </Box>
)

const Section = ({
  title,
  playlists,
  onPlaylistPlay,
  onShowTracks,
  openUri,
}: {
  title: string
  playlists: Playlist[]
} & PlaylistQuickGridProps) =>
  playlists.length === 0 ? null : (
    <Box component="section" aria-label={title} sx={{ mb: 3 }}>
      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
        {title}
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          gap: 3,
        }}
      >
        {playlists.map((playlist) => (
          <PlaylistTile
            key={playlist.uri}
            playlist={playlist}
            open={openUri === playlist.uri}
            onPlay={() => onPlaylistPlay(playlist.uri)}
            onShowTracks={() => onShowTracks(playlist.uri)}
          />
        ))}
      </Box>
    </Box>
  )

/**
 * Quick-set playlist picker: every playlist is a tile that plays on one
 * tap, with a Tracks button for choosing a start track. Typing filters the
 * tiles instantly and, after a short pause, adds matching Spotify results.
 */
const PlaylistQuickGrid = (props: PlaylistQuickGridProps) => {
  const [presets, setPresets] = useState<Playlist[]>([])
  const [own, setOwn] = useState<Playlist[]>([])
  const [searchResults, setSearchResults] = useState<Playlist[]>([])
  const [loading, setLoading] = useState(true)
  const [searchLoading, setSearchLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounce(query, SEARCH_DEBOUNCE_MS)

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch(withBasePath(API_SPOTIFY_PLAYLISTS))
        if (!response.ok) throw new Error('Failed to fetch playlists')
        const data = await response.json()
        setPresets(
          (data.presetPlaylists ?? []).map((p: Playlist) => ({
            ...p,
            isPreset: true,
          }))
        )
        setOwn(data.userPlaylists ?? [])
      } catch (err) {
        logger.error('Error fetching playlists:', err)
        setError(
          err instanceof Error ? err.message : 'Failed to fetch playlists'
        )
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  useEffect(() => {
    const term = debouncedQuery.trim()
    if (!term) {
      setSearchResults([])
      setSearchLoading(false)
      return
    }
    const controller = new AbortController()
    const search = async () => {
      setSearchLoading(true)
      try {
        const response = await fetch(
          withBasePath(
            `/api/spotify/playlists/search?q=${encodeURIComponent(term)}`
          ),
          { signal: controller.signal }
        )
        if (!response.ok) throw new Error('Failed to search playlists')
        const data = await response.json()
        setSearchResults(data.items ?? [])
      } catch (err) {
        if (controller.signal.aborted) return
        logger.error('Error searching playlists:', err)
        setSearchResults([])
      } finally {
        if (!controller.signal.aborted) setSearchLoading(false)
      }
    }
    void search()
    return () => controller.abort()
  }, [debouncedQuery])

  const { shownPresets, shownOwn, shownResults } = useMemo(() => {
    const term = query.toLowerCase().trim()
    const matches = (p: Playlist) =>
      !term || p.name.toLowerCase().includes(term)
    const shownPresets = presets.filter(matches)
    const shownOwn = own.filter(matches)
    const known = new Set([...shownPresets, ...shownOwn].map((p) => p.uri))
    const shownResults = term
      ? searchResults.filter((p) => !known.has(p.uri))
      : []
    return { shownPresets, shownOwn, shownResults }
  }, [presets, own, searchResults, query])

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4, gap: 2 }}>
        <CircularProgress size={24} />
        <Typography>Loading playlists...</Typography>
      </Box>
    )
  }
  if (error) return <Alert severity="error">{error}</Alert>

  const nothingShown =
    shownPresets.length + shownOwn.length + shownResults.length === 0

  return (
    <Box>
      <TextField
        fullWidth
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Filter or search playlists"
        inputProps={{ 'aria-label': 'Filter or search playlists' }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Search />
            </InputAdornment>
          ),
          endAdornment: searchLoading ? (
            <InputAdornment position="end">
              <CircularProgress size={20} />
            </InputAdornment>
          ) : null,
        }}
        sx={{ mb: 2 }}
      />
      <Section title="Presets" playlists={shownPresets} {...props} />
      <Section title="Your playlists" playlists={shownOwn} {...props} />
      <Section title="From Spotify" playlists={shownResults} {...props} />
      {nothingShown && !searchLoading && (
        <Typography color="text.secondary" align="center">
          {query.trim()
            ? `No playlists match "${query.trim()}"`
            : 'No playlists available'}
        </Typography>
      )}
    </Box>
  )
}

export default PlaylistQuickGrid
