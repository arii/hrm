// File: utils/socketHandlers/spotifyCommandHandler.ts
import { WebSocket } from "ws";
import { z } from "zod";
import { clientData, spotifyServiceInstance } from "../socketManager";

const _SpotifyCommandMessageSchema = z.object({
  type: z.literal("SPOTIFY_COMMAND"),
  command: z.union([
    z.literal("PLAY"),
    z.literal("PAUSE"),
    z.literal("NEXT"),
    z.literal("PREVIOUS"),
    z.literal("TRANSFER_PLAYBACK"),
    z.literal("SET_VOLUME"),
  ]),
  deviceId: z.string().optional(),
  volume: z.number().min(0).max(100).optional(),
});

type SpotifyCommandMessage = z.infer<typeof _SpotifyCommandMessageSchema>;

export const handleSpotifyCommand = (ws: WebSocket, message: SpotifyCommandMessage) => {
  const userData = clientData.get(ws);
  if (!userData) return;

  if (
    spotifyServiceInstance &&
    userData.userId &&
    userData.encryptedRefreshToken
  ) {
    spotifyServiceInstance.handleCommand(
      userData.userId,
      userData.encryptedRefreshToken,
      message.command,
      message.deviceId,
      message.volume
    );
  }
};
