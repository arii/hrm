// hooks/useUserPreferences.ts
import { useEffect, useState } from 'react'
import { MeasurementSystem, Gender } from '../types'

// Nullable fields represent user-provided data that may not have been explicitly set (e.g., userAge).
// Other fields have default values but can be cleared by the user.
export interface UserPreferences {
  // Rationale for defaults:
  // - `autoConnect: true`: Provides a better user experience for returning users
  //   by automatically connecting to their known device.
  // - `userWeight` and `userHeight` are set to common averages to ensure
  //   calorie calculations are reasonable even if the user hasn't set their own.
  theme: 'dark' | 'light'
  volumeLevel: number
  defaultWorkDuration: number
  defaultRestDuration: number
  favoritePlaylist: string
  userName: string
  userAge: number | null
  userWeight: number | null // Always in KG
  userHeight: number | null // Always in CM
  gender: Gender
  unitSystem: MeasurementSystem
  autoConnect: boolean
  deviceId: string | null
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'dark',
  volumeLevel: 70,
  defaultWorkDuration: 20,
  defaultRestDuration: 10,
  favoritePlaylist: '',
  userName: '',
  userAge: 30,
  userWeight: 70, // Default to 70kg
  userHeight: 175, // Default to 175cm
  gender: 'MALE',
  unitSystem: 'METRIC',
  autoConnect: true,
  deviceId: null,
}

// This function handles the one-time migration of settings from the old,
// individual localStorage keys to the new centralized `user-prefs` object.
// It also cleans up any "zombie" keys from older versions of the preferences.
const getInitialValue = (): UserPreferences => {
  if (typeof window === 'undefined') {
    return DEFAULT_PREFERENCES
  }

  let finalPrefs: UserPreferences

  // First, try to get the modern, centralized preferences.
  const storedPrefsRaw = localStorage.getItem('user-prefs')
  if (storedPrefsRaw) {
    try {
      const parsedPrefs = JSON.parse(storedPrefsRaw)
      finalPrefs = { ...DEFAULT_PREFERENCES, ...parsedPrefs }
    } catch {
      finalPrefs = { ...DEFAULT_PREFERENCES }
    }
  } else if (localStorage.getItem('hrm-user-name') !== null) {
    // If no modern prefs are found, check for old, individual keys.
    // This indicates a migration is needed.
    console.log(
      'Migrating old user settings from individual localStorage keys...'
    )

    const migrated: Partial<UserPreferences> = {}

    // Data Extraction and Transformation
    const oldUserName = localStorage.getItem('hrm-user-name')
    if (oldUserName) migrated.userName = oldUserName

    const oldUserAge = localStorage.getItem('hrm-user-age')
    if (oldUserAge) migrated.userAge = parseInt(oldUserAge, 10)

    const oldWeightInKg = localStorage.getItem('hrm-user-weight')
    if (oldWeightInKg) migrated.userWeight = parseFloat(oldWeightInKg)

    const oldHeightInCm = localStorage.getItem('hrm-user-height')
    if (oldHeightInCm) migrated.userHeight = parseFloat(oldHeightInCm)

    const oldGender = localStorage.getItem('hrm-user-gender') as Gender | null
    if (oldGender) migrated.gender = oldGender

    const oldUnitSystem = localStorage.getItem(
      'hrm-user-units'
    ) as MeasurementSystem | null
    if (oldUnitSystem) migrated.unitSystem = oldUnitSystem

    const oldDeviceId = localStorage.getItem('hrm-device-id')
    if (oldDeviceId)
      migrated.deviceId = oldDeviceId

      // Cleanup: Remove old keys after migration.
    ;[
      'hrm-user-name',
      'hrm-user-age',
      'hrm-user-weight',
      'hrm-user-height',
      'hrm-user-gender',
      'hrm-user-units',
      'hrm-device-id',
    ].forEach((key) => localStorage.removeItem(key))

    console.log('Migration complete. Old keys removed.')
    finalPrefs = { ...DEFAULT_PREFERENCES, ...migrated }
  } else {
    // If no stored preferences are found at all, use the defaults.
    finalPrefs = { ...DEFAULT_PREFERENCES }
  }

  // --- Zombie Key Cleanup ---
  // Ensure that the final preferences object only contains keys that are
  // defined in the current version of DEFAULT_PREFERENCES. This prevents
  // old, obsolete keys from persisting in localStorage.
  const cleanedPrefs = (
    Object.keys(finalPrefs) as Array<keyof UserPreferences>
  ).reduce((acc, key) => {
    if (key in DEFAULT_PREFERENCES) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(acc as any)[key] = finalPrefs[key]
    }
    return acc
  }, {} as Partial<UserPreferences>)

  return { ...DEFAULT_PREFERENCES, ...cleanedPrefs }
}

export const useUserPreferences = () => {
  // By using a lazy initializer for useState (`useState(getInitialValue)`),
  // we ensure that the potentially expensive `getInitialValue` function
  // (which reads from localStorage) is only called once, during the initial render.
  // This avoids the race condition where the migration logic would run too late.
  const [prefs, setPrefs] = useState(getInitialValue)

  // A separate `useEffect` now handles persisting any changes back to localStorage.
  useEffect(() => {
    localStorage.setItem('user-prefs', JSON.stringify(prefs))
  }, [prefs])

  return [prefs, setPrefs] as const
}
