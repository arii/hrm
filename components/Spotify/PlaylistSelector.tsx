// components/Spotify/PlaylistSelector.tsx
import { MusicNote, Search } from '@mui/icons-material';
import {
    Alert,
    Autocomplete,
    Box,
    Chip,
    CircularProgress,
    Divider,
    List,
    ListItem,
    ListItemButton,
    ListItemText,
    Paper,
    TextField,
    Typography,
} from '@mui/material';
import React, { useEffect, useMemo, useState } from 'react';
import { useDebounce } from '../../hooks/useDebounce';

interface Playlist {
  name: string;
  uri: string;
  id?: string;
  isPreset?: boolean;
  isSearchResult?: boolean;
  imageUrl?: string | null;
  description?: string | null;
  trackCount?: number;
  owner?: string;
}

interface PlaylistSelectorProps {
  onPlaylistSelected: (uri: string) => void;
}

const PlaylistSelector: React.FC<PlaylistSelectorProps> = ({ onPlaylistSelected }) => {
  const [presetPlaylists, setPresetPlaylists] = useState<Playlist[]>([]);
  const [userPlaylists, setUserPlaylists] = useState<Playlist[]>([]);
  const [searchResults, setSearchResults] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);

  const debouncedSearch = useDebounce(searchQuery, 500);

  useEffect(() => {
    const fetchPlaylists = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/spotify/playlists');
        if (!response.ok) {
          throw new Error('Failed to fetch playlists');
        }
        const data = await response.json();
        const presets = (data.presetPlaylists || []).map((p: Playlist) => ({ ...p, isPreset: true }));
        const user = (data.userPlaylists || []).map((p: Playlist) => ({ ...p, isPreset: false }));
        setPresetPlaylists(presets);
        setUserPlaylists(user);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to fetch playlists';
        setError(message);
        console.error('Error fetching playlists:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPlaylists();
  }, []);

  // Fetch search results when user types
  useEffect(() => {
    if (!debouncedSearch.trim()) {
      setSearchResults([]);
      return;
    }

    const fetchSearchResults = async () => {
      setSearchLoading(true);
      try {
        const response = await fetch(`/api/spotify/playlists/search?q=${encodeURIComponent(debouncedSearch)}`);
        if (!response.ok) {
          throw new Error('Failed to search playlists');
        }
        const data = await response.json();
        setSearchResults(data.items || []);
      } catch (error) {
        console.error('Error searching playlists:', error);
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    };

    fetchSearchResults();
  }, [debouncedSearch]);

  const allPlaylists = useMemo(() => {
    return [...presetPlaylists, ...userPlaylists];
  }, [presetPlaylists, userPlaylists]);

  const filteredPlaylists = useMemo(() => {
    if (!debouncedSearch.trim()) {
      return allPlaylists;
    }
    
    // When searching, combine local matches with Spotify search results
    const query = debouncedSearch.toLowerCase();
    const localMatches = allPlaylists.filter(
      (playlist) => playlist.name.toLowerCase().includes(query)
    );
    
    // Combine local matches with search results, removing duplicates by URI
    const combined = [...localMatches];
    const existingUris = new Set(localMatches.map(p => p.uri));
    
    searchResults.forEach((playlist) => {
      if (!existingUris.has(playlist.uri)) {
        combined.push(playlist);
      }
    });
    
    return combined;
  }, [allPlaylists, debouncedSearch, searchResults]);

  const handlePlaylistSelect = (playlist: Playlist | null) => {
    setSelectedPlaylist(playlist);
    if (playlist) {
      onPlaylistSelected(playlist.uri);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading playlists...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
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
            placeholder="Search your playlists or browse popular playlists..."
            InputProps={{
              ...params.InputProps,
              startAdornment: <Search sx={{ color: 'text.secondary', mr: 1 }} />,
              endAdornment: searchLoading ? (
                <CircularProgress size={20} sx={{ mr: 1 }} />
              ) : null,
            }}
          />
        )}
        renderOption={(props, option) => (
          <Box component="li" {...props} key={option.uri}>
            <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
              {option.imageUrl ? (
                <Box
                  component="img"
                  src={option.imageUrl}
                  alt={option.name}
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 1,
                    mr: 1,
                    objectFit: 'cover',
                  }}
                />
              ) : (
                <MusicNote sx={{ mr: 1, color: 'text.secondary', fontSize: 20 }} />
              )}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" noWrap>
                  {option.name}
                </Typography>
                {option.trackCount !== undefined && (
                  <Typography variant="caption" color="text.secondary">
                    {option.trackCount} tracks
                  </Typography>
                )}
              </Box>
              {option.isPreset && (
                <Chip
                  label="Preset"
                  size="small"
                  sx={{ ml: 1, height: 20, fontSize: '0.7rem' }}
                />
              )}
              {option.isSearchResult && !option.isPreset && (
                <Chip
                  label="Spotify"
                  size="small"
                  color="success"
                  sx={{ ml: 1, height: 20, fontSize: '0.7rem' }}
                />
              )}
            </Box>
          </Box>
        )}
        noOptionsText={
          debouncedSearch ? `No playlists found matching "${debouncedSearch}"` : 'No playlists available'
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
                  <ListItemButton
                    key={playlist.uri}
                    selected={selectedPlaylist?.uri === playlist.uri}
                    onClick={() => handlePlaylistSelect(playlist)}
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
                          ? `${playlist.trackCount} tracks`
                          : undefined
                      }
                    />
                    <Chip
                      label="Preset"
                      size="small"
                      sx={{ height: 20, fontSize: '0.7rem' }}
                    />
                  </ListItemButton>
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
                  <ListItemButton
                    key={playlist.uri}
                    selected={selectedPlaylist?.uri === playlist.uri}
                    onClick={() => handlePlaylistSelect(playlist)}
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
                  </ListItemButton>
                ))}
              </>
            )}
          </List>
        </Paper>
      )}

      {searchQuery && (
        <Paper variant="outlined" sx={{ maxHeight: 300, overflow: 'auto', mt: 1 }}>
          {searchLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 3 }}>
              <CircularProgress size={24} />
              <Typography sx={{ ml: 2 }} variant="body2" color="text.secondary">
                Searching Spotify...
              </Typography>
            </Box>
          ) : filteredPlaylists.length > 0 ? (
            <List dense>
              {filteredPlaylists.map((playlist) => (
                <ListItemButton
                  key={playlist.uri}
                  selected={selectedPlaylist?.uri === playlist.uri}
                  onClick={() => handlePlaylistSelect(playlist)}
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
                      sx={{ height: 20, fontSize: '0.7rem' }}
                    />
                  )}
                  {playlist.isSearchResult && !playlist.isPreset && (
                    <Chip
                      label="Spotify"
                      size="small"
                      color="success"
                      sx={{ height: 20, fontSize: '0.7rem' }}
                    />
                  )}
                </ListItemButton>
              ))}
            </List>
          ) : (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                No playlists found matching "{searchQuery}"
              </Typography>
            </Box>
          )}
        </Paper>
      )}
    </Box>
  );
};

export default PlaylistSelector;
