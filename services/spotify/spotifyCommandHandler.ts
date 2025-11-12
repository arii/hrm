// File: services/spotify/spotifyCommandHandler.ts
import { executePlayerCommand } from "./spotifyApi.js";
import { UserTokenManager } from "../userTokenManager.js";

type SpotifyCommand =
  | "PLAY"
  | "PAUSE"
  | "NEXT"
  | "PREVIOUS"
  | "TRANSFER_PLAYBACK"
  | "SET_VOLUME";

export const handleCommand = async (
  tokenManager: UserTokenManager,
  userId: string,
  encryptedRefreshToken: string,
  command: SpotifyCommand,
  deviceId?: string,
  volume?: number
) => {
  const accessToken = await tokenManager.getValidAccessTokenForUser(
    userId,
    encryptedRefreshToken
  );
  if (!accessToken) {
    console.warn(
      `Cannot execute command for user ${userId}: Access token is missing.`
    );
    return;
  }

  const body: Record<string, unknown> = deviceId ? { device_id: deviceId } : {};

  switch (command) {
    case "PLAY":
      await executePlayerCommand(accessToken, "play", "PUT", body);
      break;
    case "PAUSE":
      await executePlayerCommand(accessToken, "pause", "PUT", body);
      break;
    case "NEXT":
      await executePlayerCommand(accessToken, "next", "POST", body);
      break;
    case "PREVIOUS":
      await executePlayerCommand(accessToken, "previous", "POST", body);
      break;
    case "TRANSFER_PLAYBACK":
      if (deviceId) {
        await executePlayerCommand(accessToken, "", "PUT", {
          device_ids: [deviceId],
          play: true,
        });
      } else {
        console.warn("TRANSFER_PLAYBACK command requires a deviceId.");
      }
      break;
    case "SET_VOLUME":
      if (volume !== undefined && volume >= 0 && volume <= 100) {
        const safeVolume = Math.round(volume);
        const endpoint = `volume?volume_percent=${safeVolume}${
          deviceId ? `&device_id=${deviceId}` : ""
        }`;
        await executePlayerCommand(accessToken, endpoint, "PUT");
      } else {
        console.warn("SET_VOLUME command requires a valid volume (0-100).");
      }
      break;
    default:
      console.warn(`Unknown Spotify command: ${command}`);
  }
};
