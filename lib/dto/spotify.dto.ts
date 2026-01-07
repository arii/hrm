
/**
 * @fileoverview Data Transfer Objects for Spotify API responses.
 */

import { z } from 'zod'
import {
  SpotifyPresetPlaylistSchema,
  SpotifyUserPlaylistSchema,
} from '@/lib/validation/schemas'

/**
 * Data Transfer Object for a preset Spotify playlist.
 */
export type PresetPlaylistDto = z.infer<typeof SpotifyPresetPlaylistSchema>

/**
 * Data Transfer Object for a user's Spotify playlist.
 */
export type UserPlaylistDto = z.infer<typeof SpotifyUserPlaylistSchema>
