// File: services/userProfileService.ts
/**
 * User Profile Service
 *
 * This service manages user profile data, persisting it to a JSON file.
 * It follows the existing pattern in the project for storing data like Spotify tokens.
 */
import { promises as fs } from 'fs'
import path from 'path'
import logger from '../utils/logger'

const PROFILES_FILE_PATH = path.join(process.cwd(), 'logs', 'user_profiles.json')

export interface UserProfile {
  name: string
  age?: number
  height?: number
  weight?: number
  assignedGenderAtBirth?: 'male' | 'female' | 'other'
}

type UserProfiles = Record<string, UserProfile>

/**
 * Reads all user profiles from the JSON file.
 * @returns A promise that resolves to a record of user profiles.
 */
const readProfiles = async (): Promise<UserProfiles> => {
  try {
    const data = await fs.readFile(PROFILES_FILE_PATH, 'utf-8')
    return JSON.parse(data)
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return {} // File doesn't exist yet, return empty object
    }
    logger.error({ error }, 'Failed to read user profiles file')
    throw error
  }
}

/**
 * Writes user profiles to the JSON file.
 * @param profiles - The user profiles to write.
 */
const writeProfiles = async (profiles: UserProfiles): Promise<void> => {
  try {
    await fs.writeFile(PROFILES_FILE_PATH, JSON.stringify(profiles, null, 2))
  } catch (error) {
    logger.error({ error }, 'Failed to write user profiles file')
    throw error
  }
}

/**
 * Gets a user's profile.
 * @param userName - The name of the user.
 * @returns The user's profile, or null if not found.
 */
export const getProfile = async (
  userName: string
): Promise<UserProfile | null> => {
  const profiles = await readProfiles()
  return profiles[userName] || null
}

/**
 * Updates a user's profile.
 * @param userName - The name of the user.
 * @param data - The data to update.
 * @returns The updated user profile.
 */
export const updateProfile = async (
  userName: string,
  data: Partial<UserProfile>
): Promise<UserProfile> => {
  const profiles = await readProfiles()
  const existingProfile = profiles[userName] || { name: userName }
  const updatedProfile = { ...existingProfile, ...data }
  profiles[userName] = updatedProfile
  await writeProfiles(profiles)
  return updatedProfile
}
