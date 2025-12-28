// File: components/PersonalAnalyticsDashboard.tsx
'use client'
import { useCalorieCounter } from '../hooks/useCalorieCounter'
import { useUserSettings } from '@/context/UserSettingsContext'

/**
 * A component to display the user's personal analytics.
 * @param {object} props - The component props.
 * @param {number} props.heartRate - The current heart rate.
 * @param {number} props.age - The user's age.
 * @param {number} props.weight - The user's weight in kg.
 * @returns {JSX.Element} - The rendered component.
 */
export const PersonalAnalyticsDashboard = ({
  heartRate,
  age,
  weight,
}: {
  heartRate: number
  age: number
  weight: number
}) => {
  const [userSettings] = useUserSettings()
  const { calories } = useCalorieCounter(
    heartRate,
    age,
    weight,
    userSettings.gender,
    true
  )

  return (
    <div>
      <h2>Personal Analytics</h2>
      <p>Calories Burned: {calories.toFixed(2)}</p>
    </div>
  )
}
