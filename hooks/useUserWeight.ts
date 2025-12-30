import { useUserPhysicalProfile } from '@/context/UserPhysicalProfileContext'

/**
 * @deprecated Use useUserPhysicalProfile() directly.
 */
export const useUserWeight = (): [number, (value: number) => void] => {
  const { profile, updateProfile } = useUserPhysicalProfile()

  // Return compatible signature: [weightInKg, setter]
  return [
    profile.weight,
    (newWeight: number) => updateProfile({ weight: newWeight })
  ]
}
