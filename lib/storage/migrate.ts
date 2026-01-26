/**
 * @file Storage migration utilities for consolidating legacy localStorage data
 * Helps transition from multiple keys to a unified schema
 */

import { AppPreferences, DEFAULT_APP_PREFERENCES, STORAGE_KEYS } from './schema'
import { getCookie } from '../../utils/cookies'

/**
 * Migrates legacy localStorage keys to the new consolidated schema
 * Reads from old keys and consolidates into the new structure
 * Maintains backward compatibility
 */
export function migrateStorageSchema(): AppPreferences {
  if (typeof window === 'undefined') {
    return DEFAULT_APP_PREFERENCES
  }

  const prefs = { ...DEFAULT_APP_PREFERENCES }

  try {
    // Try to load from consolidated key first
    const existingPrefs = window.localStorage.getItem(
      STORAGE_KEYS.APP_PREFERENCES
    )
    if (existingPrefs) {
      const parsed = JSON.parse(existingPrefs)
      return { ...prefs, ...parsed }
    }

    // Migrate from legacy user-prefs
    const legacyUserPrefs = window.localStorage.getItem(STORAGE_KEYS.USER_PREFS)
    if (legacyUserPrefs) {
      const parsed = JSON.parse(legacyUserPrefs)
      if (parsed.userName) prefs.user.name = parsed.userName
      if (parsed.userAge !== undefined) prefs.user.age = parsed.userAge
      if (parsed.gender) prefs.user.gender = parsed.gender
      if (parsed.userWeight !== undefined)
        prefs.user.weightKg = parsed.userWeight
      if (parsed.unitSystem) prefs.user.unitSystem = parsed.unitSystem
      if (parsed.theme) prefs.theme = parsed.theme
      if (parsed.volumeLevel !== undefined)
        prefs.audio.volume = parsed.volumeLevel
      if (parsed.defaultWorkDuration !== undefined)
        prefs.defaultWorkDuration = parsed.defaultWorkDuration
      if (parsed.defaultRestDuration !== undefined)
        prefs.defaultRestDuration = parsed.defaultRestDuration
      if (parsed.favoritePlaylist)
        prefs.favoritePlaylist = parsed.favoritePlaylist
      if (parsed.autoConnect !== undefined)
        prefs.connection.autoConnect = parsed.autoConnect
    }

    // Migrate from legacy height key
    const heightStr = window.localStorage.getItem(STORAGE_KEYS.USER_HEIGHT)
    if (heightStr) {
      try {
        const heightCm = parseFloat(heightStr)
        if (!isNaN(heightCm)) prefs.user.heightCm = heightCm
      } catch {
        // Ignore parse errors
      }
    }

    // Migrate from legacy volume/mute keys
    const volumeStr = window.localStorage.getItem(STORAGE_KEYS.PREFERRED_VOLUME)
    if (volumeStr) {
      try {
        const volume = Number(volumeStr)
        if (!isNaN(volume)) prefs.audio.volume = volume
      } catch {
        // Ignore parse errors
      }
    }

    const muteStr = window.localStorage.getItem(STORAGE_KEYS.MUTED)
    if (muteStr) {
      prefs.audio.isMuted = muteStr === 'true'
    }

    // Try to load from cookies as fallback
    const cookiePrefs = getCookie(STORAGE_KEYS.CONNECTION_PREFS)
    if (cookiePrefs) {
      try {
        const parsed = JSON.parse(cookiePrefs)
        if (parsed.userName) prefs.user.name = parsed.userName
        if (parsed.userAge) prefs.user.age = parsed.userAge
      } catch {
        // Ignore parse errors
      }
    }

    return prefs
  } catch (error) {
    console.error('Error during storage migration:', error)
    return DEFAULT_APP_PREFERENCES
  }
}

/**
 * Saves preferences to localStorage using the new consolidated schema
 */
export function saveStoragePreferences(prefs: AppPreferences): void {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(
      STORAGE_KEYS.APP_PREFERENCES,
      JSON.stringify(prefs)
    )
  } catch (error) {
    console.error('Error saving preferences:', error)
  }
}

/**
 * Clears all legacy storage keys (after migration is confirmed)
 * Call this after a successful migration to clean up old data
 */
export function clearLegacyStorageKeys(): void {
  if (typeof window === 'undefined') return

  const legacyKeys = [
    STORAGE_KEYS.USER_PREFS,
    STORAGE_KEYS.USER_HEIGHT,
    STORAGE_KEYS.PREFERRED_VOLUME,
    STORAGE_KEYS.MUTED,
    STORAGE_KEYS.USER_WEIGHT,
    STORAGE_KEYS.CONNECTION_PREFS,
  ]

  try {
    legacyKeys.forEach((key) => {
      window.localStorage.removeItem(key)
    })
  } catch (error) {
    console.error('Error clearing legacy storage keys:', error)
  }
}
