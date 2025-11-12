// File: utils/socketHandlers/identifyHandler.ts
import { WebSocket } from "ws";
import { z } from "zod";
import { pollSpotify, stopSpotifyPolling } from "../socketManager";
import { clientData, pollingIntervals } from "../socketManager";

const _IdentifyMessageSchema = z.object({
  type: z.literal("IDENTIFY"),
  userId: z.string(),
  encryptedRefreshToken: z.string(),
});

type IdentifyMessage = z.infer<typeof _IdentifyMessageSchema>;

export const handleIdentify = (ws: WebSocket, message: IdentifyMessage) => {
  const userData = clientData.get(ws);
  if (!userData) return;

  userData.userId = message.userId;
  userData.encryptedRefreshToken = message.encryptedRefreshToken;
  console.log(`Client identified as user: ${message.userId}`);
  // Start polling for this user
  stopSpotifyPolling(message.userId); // Stop any existing poll for this user
  pollSpotify(message.userId, message.encryptedRefreshToken); // Initial poll
  const interval = setInterval(
    () => pollSpotify(message.userId, message.encryptedRefreshToken),
    5000 // Poll every 5 seconds
  );
  pollingIntervals.set(message.userId, interval);
};
