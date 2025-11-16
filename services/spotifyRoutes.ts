// services/spotifyRoutes.ts
import { Router, Request, Response } from 'express';
import SpotifyPolling from './spotifyPolling.js';

export const createSpotifyRouter = (
  spotifyService: SpotifyPolling,
  isSpotifyInitialized: () => boolean
): Router => {
  const router = Router();

  // API endpoint to get available Spotify devices
  router.get('/devices', async (req: Request, res: Response) => {
    if (!isSpotifyInitialized()) {
      return res.status(503).json({ error: 'Spotify service not initialized.' });
    }
    try {
      const devices = await spotifyService.getAvailableDevices();
      return res.json(devices);
    } catch (error) {
      console.error('Error fetching Spotify devices via API:', error);
      return res.status(500).json({ error: 'Failed to fetch Spotify devices.' });
    }
  });

  // API endpoint to get preset and user Spotify playlists
  router.get('/playlists', async (req: Request, res: Response) => {
    if (!isSpotifyInitialized()) {
      return res.status(503).json({ error: 'Spotify service not initialized.' });
    }
    try {
      let presetPlaylists;
      if (process.env.SPOTIFY_PRESET_PLAYLISTS) {
        try {
          presetPlaylists = JSON.parse(process.env.SPOTIFY_PRESET_PLAYLISTS);
        } catch (e) {
          console.warn('Failed to parse SPOTIFY_PRESET_PLAYLISTS env variable, using defaults.');
          presetPlaylists = [
            { name: 'HIIT', uri: 'spotify:playlist:37i9dQZF1DX4p6TLfEhgD5' },
            { name: 'Rock', uri: 'spotify:playlist:37i9dQZF1DX1spT6G94GFC' },
            { name: 'Pop', uri: 'spotify:playlist:37i9dQZF1DXcBWfL3ps8cR' },
          ];
        }
      } else {
        presetPlaylists = [
          { name: 'HIIT', uri: 'spotify:playlist:37i9dQZF1DX4p6TLfEhgD5' },
          { name: 'Rock', uri: 'spotify:playlist:37i9dQZF1DX1spT6G94GFC' },
          { name: 'Pop', uri: 'spotify:playlist:37i9dQZF1DXcBWfL3ps8cR' },
        ];
      }
      const userPlaylists = await spotifyService.getUserPlaylists();
      return res.json({ presetPlaylists, userPlaylists });
    } catch (error) {
      console.error('Error fetching Spotify playlists via API:', error);
      return res.status(500).json({ error: 'Failed to fetch Spotify playlists.' });
    }
  });

  // API endpoint for on-demand token refreshing
  router.post('/refresh-token', async (req: Request, res: Response) => {
    if (!isSpotifyInitialized()) {
      return res.status(503).json({ error: 'Spotify service not initialized.' });
    }
    try {
      const success = await spotifyService.forceRefreshToken();
      if (success) {
        return res.status(200).json({ message: 'Token refreshed successfully.' });
      } else {
        return res.status(500).json({ error: 'Failed to refresh token.' });
      }
    } catch (error) {
      console.error('Error refreshing Spotify token via API:', error);
      return res.status(500).json({ error: 'Failed to refresh Spotify token.' });
    }
  });

  return router;
};
