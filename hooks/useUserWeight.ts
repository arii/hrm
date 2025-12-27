// hooks/useUserWeight.ts
import useLocalStorage from './useLocalStorage'

export const useUserWeight = (): [number, (value: number) => void] => {
  const [weightInKg, setWeightInKg] = useLocalStorage('hrm-user-weight', '70') // Always KG

  const setWeight = (value: number) => {
    setWeightInKg(value.toString())
  }

  return [parseFloat(weightInKg), setWeight]
}
