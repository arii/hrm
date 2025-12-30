'use client'

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useCallback,
} from 'react'
import { v4 as uuidv4 } from 'uuid'
import { useSession } from 'next-auth/react'
import useLocalStorage from '@/hooks/useLocalStorage'
import { UserPhysicalProfile } from '@/types/core'

// Default state for new users (or unauthenticated guests)
const DEFAULT_PHYSICAL_PROFILE: UserPhysicalProfile = {
  userId: uuidv4(), // Generate a unique ID for guests
  age: 30,
  weight: 70, // 70kg (~154lbs)
  gender: 'MALE',
  unitSystem: 'METRIC',
  maxHr: 190,
}

interface UserPhysicalProfileContextType {
  profile: UserPhysicalProfile
  updateProfile: (updates: Partial<UserPhysicalProfile>) => void
  isLoading: boolean
}

const UserPhysicalProfileContext = createContext<
  UserPhysicalProfileContextType | undefined
>(undefined)

export const UserPhysicalProfileProvider: React.FC<{
  children: React.ReactNode
}> = ({ children }) => {
  const { data: session, status } = useSession()

  // Persist profile to localStorage for immediate availability
  const [profile, setProfile] = useLocalStorage<UserPhysicalProfile>(
    'hrm-user-physical-profile',
    DEFAULT_PHYSICAL_PROFILE
  )

  // Sync userId from Auth Session if available
  useEffect(() => {
    if (session?.user?.email && profile.userId !== session.user.email) {
      // In a real app, you would Fetch the profile from API here.
      // For now, we just bind the record to the user's ID
      setProfile((prev) => ({ ...prev, userId: session.user?.email ?? '' }))
    }
  }, [session, profile.userId, setProfile])

  const updateProfile = useCallback(
    (updates: Partial<UserPhysicalProfile>) => {
      setProfile((prev) => ({ ...prev, ...updates }))
    },
    [setProfile]
  )

  const value = useMemo(
    () => ({
      profile,
      updateProfile,
      isLoading: status === 'loading',
    }),
    [profile, status, updateProfile]
  )

  return (
    <UserPhysicalProfileContext.Provider value={value}>
      {children}
    </UserPhysicalProfileContext.Provider>
  )
}

export const useUserPhysicalProfile = () => {
  const context = useContext(UserPhysicalProfileContext)
  if (context === undefined) {
    throw new Error(
      'useUserPhysicalProfile must be used within a UserPhysicalProfileProvider'
    )
  }
  return context
}
