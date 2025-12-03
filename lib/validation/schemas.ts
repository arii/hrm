import { z } from 'zod';

// Spotify Control Schema
export const spotifyControlSchema = z.object({
  command: z.enum(['PLAY', 'PAUSE', 'NEXT', 'PREVIOUS', 'SET_VOLUME', 'TRANSFER_PLAYBACK']),
  volume: z.number().min(0).max(100).optional(),
  deviceId: z.string().optional(),
}).refine(data => {
    if (data.command === 'SET_VOLUME') {
        return data.volume !== undefined;
    }
    if (data.command === 'TRANSFER_PLAYBACK') {
        return data.deviceId !== undefined;
    }
    return true;
}, {
    message: "Volume is required for SET_VOLUME command, and deviceId is required for TRANSFER_PLAYBACK command",
});

// Spotify Token Delivery Schema
export const spotifyTokenDeliverySchema = z.object({
    sub: z.string(),
    access_token: z.string(),
    refresh_token: z.string(),
    expires_in: z.number(),
    obtainedAt: z.number(),
});

// General Error Schema
export const errorSchema = z.object({
    error: z.string(),
    details: z.string().optional(),
});
