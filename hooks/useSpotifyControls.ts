// hooks/useSpotifyControls.ts
import { useCallback } from 'react';
import { useWebSocket } from '@/context/WebSocketContext';
import { SpotifyCommand, SpotifyCommandMessage, SpotifyRepeatState } from '@/types/websocket';

type CommandPayload = {
  volume?: number;
  repeatState?: SpotifyRepeatState;
  deviceId?: string;
  playlistUri?: string;
  shuffleState?: boolean;
};

export const useSpotifyControls = () => {
  const { sendData, spotifyData } = useWebSocket();
  const activeDeviceId = spotifyData.devices?.find(d => d.is_active)?.id;

  const sendCommand = useCallback(
    (command: SpotifyCommand, payload: CommandPayload = {}) => {
      const message: SpotifyCommandMessage = {
        type: 'SPOTIFY_COMMAND',
        command,
        ...payload,
      };

      // For playback commands, automatically use the active device ID if none is provided
      if (
        ['PLAY', 'PAUSE', 'NEXT', 'PREVIOUS', 'SET_VOLUME', 'TOGGLE_SHUFFLE', 'SET_REPEAT_MODE'].includes(command) &&
        !message.deviceId
      ) {
        if (activeDeviceId) {
          message.deviceId = activeDeviceId;
        }
      }

      sendData(message);
    },
    [sendData, activeDeviceId]
  );

  return {
    sendCommand,
  };
};
