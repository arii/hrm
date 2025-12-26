// File: hooks/useCalorieCounter.ts
import { useState, useEffect } from 'react';
import { calculateCalories } from '../lib/calorie-estimation';

/**
 * A hook to calculate calories burned during a workout.
 * @param {number} heartRate - The current heart rate.
 * @param {number} age - The user's age.
 * @param {number} weight - The user's weight in kg.
 * @returns {number} - The total calories burned.
 */
export const useCalorieCounter = (heartRate: number, age: number, weight: number): number => {
  const [calories, setCalories] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      if (heartRate > 0) {
        const newCalories = calculateCalories(heartRate, age, weight);
        setCalories((prevCalories) => prevCalories + newCalories);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [heartRate, age, weight]);

  return calories;
};
