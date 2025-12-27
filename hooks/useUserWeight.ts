// hooks/useUserWeight.ts
import useLocalStorage from './useLocalStorage'

/**
 * A hook to manage the user's weight preference, persisted in local storage.
 * The weight is always stored in Kilograms (kg).
 *
 * @returns A tuple containing:
 *  - `weightInKg`: The current user weight in kg (number).
 *  - `setWeight`: A function to update the user's weight in kg.
 */
export const useUserWeight = (): [number, (value: number) => void] => {
  const [weightInKg, setWeightInKg] = useLocalStorage('hrm-user-weight', '70') // Always KG

  const setWeight = (value: number) => {
    setWeightInKg(value.toString())
  }

  return [parseFloat(weightInKg), setWeight]
}
