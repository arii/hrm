// hooks/useSpotify.ts
import { useAppState } from '@/context/AppStateContext';
import { useConnectionManager } from '@/context/ConnectionContext';
import { useCallback } from 'react';

export const useSpotify = () => {
  const { spotifyData, spotifyServiceInitialized } = useAppState();
  const { sendData } = useConnectionManager();

  const play = useCallback(
    (playlistUri?: string) => {
      sendData({ type: 'SPOTIFY_COMMAND', command: 'PLAY', playlistUri });
    },
    [sendData]
  );

  const pause = useCallback(() => {
    sendData({ type: 'SPOTIFY_COMMAND', command: 'PAUSE' });
  }, [sendData]);

  const next = useCallback(() => {
    sendData({ type: 'SPOTIFY_COMMAND', command: 'NEXT' });
  }, [sendData]);

  const previous = useCallback(() => {
    sendData({ type: 'SPOTIFY_COMMAND', command: 'PREVIOUS' });
  }, [sendData]);

  const transferPlayback = useCallback(
    (deviceId: string) => {
      sendData({
        type: 'SPOTIFY_COMMAND',
        command: 'TRANSFER_PLAYBACK',
        deviceId,
      });
    },
    [sendData]
  );

  const setVolume = useCallback(
    (volume: number) => {
      sendData({ type: 'SPOTIFY_COMMAND', command: 'SET_VOLUME', volume });
    },
    [sendData]
  );

  return {
    ...spotifyData,
    isServiceInitialized: spotifyServiceInitialized,
    play,
    pause,
    next,
    previous,
    transferPlayback,
    setVolume,
  };
};
