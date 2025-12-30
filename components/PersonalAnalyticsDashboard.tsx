// File: components/PersonalAnalyticsDashboard.tsx
import { useCalorieCounter } from '../hooks/useCalorieCounter'

/**
 * A component to display the user's personal analytics.
 * @param {object} props - The component props.
 *  @param {number} props.heartRate - The current heart rate.
 * @returns {JSX.Element} - The rendered component.
 */
export const PersonalAnalyticsDashboard = ({
  heartRate,
}: {
  heartRate: number
}) => {
  const { calories } = useCalorieCounter(heartRate, true)

  return (
    <div>
      <h2>Personal Analytics</h2>
      <p>Calories Burned: {calories.toFixed(2)}</p>
    </div>
  )
}
