/**
 * @file Consolidated schema for all localStorage data structures
 * This ensures consistent data models across all persisted preferences
 */

import { MeasurementSystem, Gender } from '../../types/core'

/**
 * Audio preferences (previously stored separately)
 */
export interface AudioPreferences {
  volume: number // 0-100
  isMuted: boolean
}

/**
 * User profile and health metrics (consolidated from multiple sources)
 */
export interface UserProfileData {
  // Basic info
  name: string
  age: number | null
  gender: Gender

  // Physical measurements
  heightCm: number | null // Always stored in cm
  weightKg: number | null // Always stored in kg

  // Preferences
  unitSystem: MeasurementSystem
}

/**
 * Connection and device preferences
 */
export interface ConnectionPreferences {
  lastConnectedDevice?: string
  autoConnect: boolean
}

/**
 * Consolidated app preferences schema
 */
export interface AppPreferences {
  // Theme and UI
  theme: 'dark' | 'light'

  // Audio
  audio: AudioPreferences

  // User data
  user: UserProfileData

  // Connection
  connection: ConnectionPreferences

  // Spotify integration
  favoritePlaylist: string

  // Timer defaults
  defaultWorkDuration: number
  defaultRestDuration: number
}

/**
 * Default values for app preferences
 */
export const DEFAULT_APP_PREFERENCES: AppPreferences = {
  theme: 'dark',
  audio: {
    volume: 70,
    isMuted: false,
  },
  user: {
    name: '',
    age: null,
    gender: 'MALE',
    heightCm: null,
    weightKg: null,
    unitSystem: 'IMPERIAL',
  },
  connection: {
    autoConnect: false,
  },
  favoritePlaylist: '',
  defaultWorkDuration: 20,
  defaultRestDuration: 10,
}

/**
 * Storage keys for different data categories
 */
export const STORAGE_KEYS = {
  // Main preferences (consolidated)
  APP_PREFERENCES: 'app-preferences',

  // Legacy keys for backward compatibility
  USER_PREFS: 'user-prefs',
  USER_HEIGHT: 'hrm-user-height',
  PREFERRED_VOLUME: 'hrm-preferred-volume',
  MUTED: 'hrm-muted',
  USER_WEIGHT: 'hrm-user-weight',
  CONNECTION_PREFS: 'hrm-connection-prefs',

  // Experimental
  EXPERIMENTAL_WORKOUT: 'experimentalWorkoutSession',
} as const

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS]
