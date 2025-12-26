// hooks/useCalorieCounter.ts
import { useState, useRef, useCallback } from 'react';

type Gender = 'male' | 'female';

interface UserProfile {
  age: number;
  weight: number;
  gender: Gender;
}

// A hook to calculate calories based on heart rate, age, weight, and gender.
export const useCalorieCounter = (userProfile: UserProfile) => {
  const [totalCalories, setTotalCalories] = useState(0);
  const lastReadingTime = useRef<number | null>(null);
  const hrBuffer = useRef<number[]>([]);

  const addReading = useCallback((heartRate: number) => {
    const now = Date.now();
    let caloriesThisInterval = 0;
    let smoothedHr = heartRate;

    if (lastReadingTime.current) {
      const dt = (now - lastReadingTime.current) / 1000; // in seconds

      // Simple Moving Average (SMA) for smoothing
      hrBuffer.current.push(heartRate);
      if (hrBuffer.current.length > 5) {
        hrBuffer.current.shift();
      }
      smoothedHr = hrBuffer.current.reduce((a, b) => a + b, 0) / hrBuffer.current.length;

      let caloriesPerMinute;
      if (userProfile.gender === 'male') {
        caloriesPerMinute = (-55.0969 + (0.6309 * smoothedHr) + (0.1988 * userProfile.weight) + (0.2017 * userProfile.age)) / 4.184;
      } else {
        caloriesPerMinute = (-20.4022 + (0.4472 * smoothedHr) - (0.1263 * userProfile.weight) + (0.074 * userProfile.age)) / 4.184;
      }

      const instantCaloriesPerSec = caloriesPerMinute / 60;
      caloriesThisInterval = instantCaloriesPerSec * dt;

      if (caloriesThisInterval > 0) {
        setTotalCalories(prev => prev + caloriesThisInterval);
      }
    }

    lastReadingTime.current = now;
    const newTotalCalories = totalCalories + (caloriesThisInterval > 0 ? caloriesThisInterval : 0);
    return { smoothedHr, totalCalories: newTotalCalories };
  }, [totalCalories, userProfile]);

  return { addReading, totalCalories };
};
