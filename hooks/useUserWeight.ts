// hooks/useUserWeight.ts
import { useEffect } from 'react'
import useCookie from './useCookie'

/**
 * A hook to manage the user's weight preference, persisted in cookies.
 * The weight is always stored in Kilograms (kg).
 *
 * @returns A tuple containing:
 *  - `weightInKg`: The current user weight in kg (number).
 *  - `setWeight`: A function to update the user's weight in kg.
 */
export const useUserWeight = (): [number, (value: number) => void] => {
  const [weightInKg, setWeightInKg] = useCookie('hrm-user-weight', 70) // Always KG

  const setWeight = (value: number) => {
    setWeightInKg(value)
  }

  // Ensure the stored value is a number before returning.
  const numericWeight =
    typeof weightInKg === 'number'
      ? weightInKg
      : parseFloat(String(weightInKg))

  const finalWeight = isNaN(numericWeight) ? 70 : numericWeight

  // Effect to reset the cookie if it's invalid
  useEffect(() => {
    if (isNaN(numericWeight)) {
      setWeightInKg(70)
    }
  }, [numericWeight, setWeightInKg])

  return [finalWeight, setWeight]
}
