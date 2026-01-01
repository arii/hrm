// hooks/useUserSettings.ts
import { useMemo } from 'react'
import useLocalStorage from './useLocalStorage'

export interface UserSettings {
  userName: string
  userAge: string
  userGender: string
  userHeight: {
    cm: string
    feet: string
    inches: string
  }
  userWeight: string
  unit: 'METRIC' | 'IMPERIAL'
  maxHr: number
  restingHr: number
}

export const useUserSettings = () => {
  const [userName, setUserName] = useLocalStorage('userName', 'Test User')
  const [userAge, setUserAge] = useLocalStorage('userAge', '30')
  const [userGender, setUserGender] = useLocalStorage('userGender', 'male')
  const [userHeight, setUserHeight] = useLocalStorage('userHeight', {
    cm: '180',
    feet: '5',
    inches: '11',
  })
  const [userWeight, setUserWeight] = useLocalStorage('userWeight', '75')
  const [unit, setUnit] = useLocalStorage<'METRIC' | 'IMPERIAL'>(
    'unit',
    'METRIC'
  )

  const maxHr = useMemo(() => {
    const age = parseInt(userAge, 10)
    return isNaN(age) ? 0 : 220 - age
  }, [userAge])

  const restingHr = useMemo(() => {
    // Placeholder for resting HR calculation
    return 60
  }, [])

  return {
    userName,
    setUserName,
    userAge,
    setUserAge,
    userGender,
    setUserGender,
    userHeight,
    setUserHeight,
    userWeight,
    setUserWeight,
    unit,
    setUnit,
    maxHr,
    restingHr,
  }
}
