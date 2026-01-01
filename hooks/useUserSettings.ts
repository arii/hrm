// hooks/useUserSettings.ts
import { useState, useEffect } from 'react'
import { useLocalStorage } from './useLocalStorage'

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
  const [savePending, setSavePending] = useState(false)

  const [maxHr, setMaxHr] = useState(0)
  const [restingHr, setRestingHr] = useState(0)

  useEffect(() => {
    const age = parseInt(userAge, 10)
    if (!isNaN(age)) {
      setMaxHr(220 - age)
    }
  }, [userAge])

  // Placeholder for resting HR calculation
  useEffect(() => {
    setRestingHr(60)
  }, [])

  useEffect(() => {
    setSavePending(true)
    const timer = setTimeout(() => {
      setSavePending(false)
    }, 1000)
    return () => clearTimeout(timer)
  }, [userName, userAge, userGender, userHeight, userWeight, unit])

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
    savePending,
  }
}
