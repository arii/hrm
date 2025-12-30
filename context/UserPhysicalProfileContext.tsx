'use client'

import React, { createContext, useContext, useEffect, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import useLocalStorage from '@/hooks/useLocalStorage'
import {
  UserPhysicalProfile,
  Gender,
  MeasurementSystem
} from '@/types/core'

// Default state for new users (or unauthenticated guests)
const DEFAULT_PHYSICAL_PROFILE: UserPhysicalProfile = {
  userId: 'guest',
  age: 30,
  weight: 70, // 70kg (~154lbs)
  gender: 'MALE',
  unitSystem: 'IMPERIAL',
  maxHr: 190,
}

interface UserPhysicalProfileContextType {
  profile: UserPhysicalProfile
  updateProfile: (updates: Partial<UserPhysicalProfile>) => void
  isLoading: boolean
}

const UserPhysicalProfileContext = createContext<UserPhysicalProfileContextType | undefined>(undefined)

export const UserPhysicalProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { data: session, status } = useSession()

  // Persist profile to localStorage for immediate availability
  const [profile, setProfile] = useLocalStorage<UserPhysicalProfile>(
    'hrm-user-physical-profile',
    DEFAULT_PHYSICAL_PROFILE
  )

  // Sync userId from Auth Session if available
  useEffect(() => {
    if (session?.user?.email && profile.userId === 'guest') {
      // In a real app, you would Fetch the profile from API here.
      // For now, we just bind the record to the user's email/ID
      setProfile((prev) => ({ ...prev, userId: session.user?.email || 'authenticated-user' }))
    }
  }, [session, profile.userId, setProfile])

  const updateProfile = (updates: Partial<UserPhysicalProfile>) => {
    setProfile((prev) => ({ ...prev, ...updates }))
  }

  const value = useMemo(() => ({
    profile,
    updateProfile,
    isLoading: status === 'loading',
  }), [profile, status, setProfile])

  return (
    <UserPhysicalProfileContext.Provider value={value}>
      {children}
    </UserPhysicalProfileContext.Provider>
  )
}

export const useUserPhysicalProfile = () => {
  const context = useContext(UserPhysicalProfileContext)
  if (context === undefined) {
    throw new Error('useUserPhysicalProfile must be used within a UserPhysicalProfileProvider')
  }
  return context
}
