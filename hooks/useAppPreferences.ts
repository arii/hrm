/**
 * @file Unified storage hook for consolidated preferences
 * Provides a single source of truth for all application preferences
 */

import { useCallback, useEffect, useState } from 'react'
import {
  AppPreferences,
  DEFAULT_APP_PREFERENCES,
  STORAGE_KEYS,
} from '../storage'
import { migrateStorageSchema, saveStoragePreferences } from '../storage'

/**
 * Hook for managing consolidated app preferences with localStorage persistence
 * Handles migration from legacy storage keys automatically
 *
 * @returns tuple of [preferences, setPrefences, isLoading]
 */
export function useAppPreferences() {
  const [prefs, setPrefs] = useState<AppPreferences>(DEFAULT_APP_PREFERENCES)
  const [isLoading, setIsLoading] = useState(true)

  // Initialize preferences from storage (with migration)
  useEffect(() => {
    if (typeof window === 'undefined') {
      setIsLoading(false)
      return
    }

    try {
      const migratedPrefs = migrateStorageSchema()
      setPrefs(migratedPrefs)
    } catch (error) {
      console.error('Error loading preferences:', error)
      setPrefs(DEFAULT_APP_PREFERENCES)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Persist preferences when they change
  const updatePreferences = useCallback((newPrefs: AppPreferences) => {
    setPrefs(newPrefs)
    saveStoragePreferences(newPrefs)
  }, [])

  // Handle storage changes from other tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.APP_PREFERENCES && e.newValue) {
        try {
          const newPrefs = JSON.parse(e.newValue)
          setPrefs(newPrefs)
        } catch (error) {
          console.error('Error parsing storage change:', error)
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  return {
    preferences: prefs,
    setPreferences: updatePreferences,
    isLoading,
  }
}
