// components/Spotify/PlaylistSelector.tsx
import React, { useState, useEffect } from 'react';
import { FormControl, InputLabel, Select, MenuItem, SelectChangeEvent, Divider, Typography } from '@mui/material';

interface Playlist {
  name: string;
  uri: string;
}

interface PlaylistSelectorProps {
  onPlaylistSelected: (uri: string) => void;
}

const PlaylistSelector: React.FC<PlaylistSelectorProps> = ({ onPlaylistSelected }) => {
  const [presetPlaylists, setPresetPlaylists] = useState<Playlist[]>([]);
  const [userPlaylists, setUserPlaylists] = useState<Playlist[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<string>('');

  useEffect(() => {
    const fetchPlaylists = async () => {
      try {
        const response = await fetch('/api/spotify/playlists');
        if (!response.ok) {
          throw new Error('Failed to fetch playlists');
        }
        const data = await response.json();
        setPresetPlaylists(data.presetPlaylists);
        setUserPlaylists(data.userPlaylists);
      } catch (error) {
        console.error('Error fetching playlists:', error);
      }
    };

    fetchPlaylists();
  }, []);

  const handleChange = (event: SelectChangeEvent<string>) => {
    const uri = event.target.value;
    setSelectedPlaylist(uri);
    onPlaylistSelected(uri);
  };

  return (
    <FormControl fullWidth>
      <InputLabel id="playlist-select-label">Playlist</InputLabel>
      <Select
        labelId="playlist-select-label"
        id="playlist-select"
        value={selectedPlaylist}
        label="Playlist"
        onChange={handleChange}
      >
        <MenuItem disabled>
          <Typography variant="caption">Preset Playlists</Typography>
        </MenuItem>
        {presetPlaylists.map((playlist) => (
          <MenuItem key={playlist.uri} value={playlist.uri}>
            {playlist.name}
          </MenuItem>
        ))}
        {userPlaylists.length > 0 && <Divider />}
        {userPlaylists.length > 0 && (
          <MenuItem disabled>
            <Typography variant="caption">Your Playlists</Typography>
          </MenuItem>
        )}
        {userPlaylists.map((playlist) => (
          <MenuItem key={playlist.uri} value={playlist.uri}>
            {playlist.name}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export default PlaylistSelector;
