'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  useUserSettings,
  UserPreferences,
} from '@/context/UserSettingsContext'

export function useUserSettingsForm() {
  const [settings, saveSettings] = useUserSettings()
  const [formData, setFormData] = useState<UserPreferences>(settings)
  const [isEditing, setIsEditing] = useState(false)

  useEffect(() => {
    // Sync form data if settings from context change
    if (JSON.stringify(settings) !== JSON.stringify(formData)) {
      setFormData(settings)
      setIsEditing(false) // Reset editing state if context changes externally
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings])

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value, type, checked } = e.target
      setFormData((prev) => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
      }))
      if (!isEditing) setIsEditing(true)
    },
    [isEditing]
  )

  const handleSelectChange = useCallback(
    (name: keyof UserPreferences, value: any) => {
      setFormData((prev) => ({ ...prev, [name]: value }))
      if (!isEditing) setIsEditing(true)
    },
    [isEditing]
  )

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      saveSettings(formData)
      setIsEditing(false) // Exit editing mode on save
    },
    [formData, saveSettings]
  )

  return {
    formData,
    handleInputChange,
    handleSelectChange,
    handleSubmit,
    isEditing,
    setIsEditing,
  }
}
