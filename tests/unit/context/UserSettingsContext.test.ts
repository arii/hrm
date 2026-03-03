import {
  migratePreferences,
  DEFAULT_PREFERENCES,
  UserPreferences,
} from '../../../context/UserSettingsContext'

describe('migratePreferences', () => {
  it('should return default preferences if stored value is null or not an object', () => {
    expect(migratePreferences(null)).toEqual(DEFAULT_PREFERENCES)
    expect(migratePreferences(undefined)).toEqual(DEFAULT_PREFERENCES)
    expect(migratePreferences('invalid')).toEqual(DEFAULT_PREFERENCES)
    expect(migratePreferences(123)).toEqual(DEFAULT_PREFERENCES)
  })

  it('should preserve valid values that match default types', () => {
    const stored: Partial<UserPreferences> = {
      theme: 'light',
      volumeLevel: 50,
    }
    const result = migratePreferences(stored)
    expect(result.theme).toBe('light')
    expect(result.volumeLevel).toBe(50)
    // Should verify other fields are defaults
    expect(result.defaultWorkDuration).toBe(
      DEFAULT_PREFERENCES.defaultWorkDuration
    )
  })

  it('should fix the critical bug: preserve numeric values for nullable fields (userAge, userWeightKg)', () => {
    const stored = {
      userAge: 30,
      userWeightKg: 75,
      userHeightCm: 180,
    }
    // Verify defaults are null
    expect(DEFAULT_PREFERENCES.userAge).toBeNull()

    const result = migratePreferences(stored)

    expect(result.userAge).toBe(30)
    expect(result.userWeightKg).toBe(75)
    expect(result.userHeightCm).toBe(180)
  })

  it('should migrate legacy weight and height fields', () => {
    const stored = {
      userWeight: 75,
      userHeight: 180,
    }
    const result = migratePreferences(stored)
    expect(result.userWeightKg).toBe(75)
    expect(result.userHeightCm).toBe(180)
  })

  it('should ignore values with mismatched types', () => {
    const stored = {
      volumeLevel: 'loud', // Should be number
      autoConnect: 'yes', // Should be boolean
    }
    const result = migratePreferences(stored)

    expect(result.volumeLevel).toBe(DEFAULT_PREFERENCES.volumeLevel)
    expect(result.autoConnect).toBe(DEFAULT_PREFERENCES.autoConnect)
  })

  it('should add missing keys from defaults', () => {
    const stored = {
      theme: 'light',
    }
    const result = migratePreferences(stored)
    expect(result).toEqual({ ...DEFAULT_PREFERENCES, theme: 'light' })
  })

  it('should strip unknown keys', () => {
    const stored = {
      theme: 'light',
      unknownKey: 'should be removed',
    }
    const result = migratePreferences(stored)
    expect((result as Record<string, unknown>).unknownKey).toBeUndefined()
  })
})
