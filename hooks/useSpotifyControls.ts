// hooks/useSpotifyControls.ts
import { useCallback } from 'react';
import { useWebSocket } from '@/context/WebSocketContext';
import { SpotifyCommand, SpotifyCommandMessage, SpotifyRepeatState } from '@/types/websocket';

// A mapping of commands to their expected additional payload keys
const commandPayloadMap: { [key in SpotifyCommand]?: string[] } = {
  SET_VOLUME: ['volume'],
  SET_REPEAT_MODE: ['repeatState'],
  TRANSFER_PLAYBACK: ['deviceId'],
  PLAY: ['playlistUri', 'deviceId'],
  PAUSE: ['deviceId'],
  NEXT: ['deviceId'],
  PREVIOUS: ['deviceId'],
};

export const useSpotifyControls = () => {
  const { sendData, spotifyData } = useWebSocket();
  const activeDeviceId = spotifyData.devices?.find(d => d.is_active)?.id;

  const sendCommand = useCallback(
    (command: SpotifyCommand, value?: string | number | boolean) => {
      const message: SpotifyCommandMessage = {
        type: 'SPOTIFY_COMMAND',
        command,
      };

      // Assign the 'value' to the correct property based on the command
      const payloadKeys = commandPayloadMap[command];
      if (payloadKeys && value !== undefined) {
        // This is a bit of a simplification. Assumes the first key is the primary one.
        // And that 'value' holds the right data type.
        // A more robust implementation might take an object of values.
        if (command === 'SET_REPEAT_MODE') {
            message.repeatState = value as SpotifyRepeatState;
        } else if (command === 'SET_VOLUME') {
            message.volume = value as number;
        } else if (command === 'TRANSFER_PLAYBACK') {
            message.deviceId = value as string;
        } else if (command === 'PLAY' && typeof value === 'string' && value.startsWith('spotify:')) {
            message.playlistUri = value;
        }
      }

      // For playback commands, automatically use the active device ID if none is provided
      if (['PLAY', 'PAUSE', 'NEXT', 'PREVIOUS', 'SET_VOLUME'].includes(command) && !message.deviceId) {
        if(activeDeviceId) {
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
