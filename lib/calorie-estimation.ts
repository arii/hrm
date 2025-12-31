import { Gender } from '@/types/core'

export interface CalorieEstimationParams {
  heartRate: number
  age: number
  weightKg: number
  durationMinutes: number
  gender: Gender
}

/**
 * Constants for the Keytel Equation (Journal of Sports Sciences).
 * @see https://www.tandfonline.com/doi/abs/10.1080/02640410400023363
 */
const KEYTEL_CONSTANTS = {
  MALE: {
    INTERCEPT: -55.0969,
    HR_FACTOR: 0.6309,
    WEIGHT_FACTOR: 0.1988,
    AGE_FACTOR: 0.2017,
  },
  FEMALE: {
    INTERCEPT: -20.4022,
    HR_FACTOR: 0.4472,
    WEIGHT_FACTOR: -0.1263, // Note: Weight factor is negative for females in this model
    AGE_FACTOR: 0.074,
  },
  KJ_TO_KCAL: 4.184,
}

export const estimateCaloriesBurned = (
  params: CalorieEstimationParams
): number => {
  const { heartRate, age, weightKg, durationMinutes, gender } = params

  // Safety gates
  if (heartRate <= 30 || durationMinutes <= 0) return 0

  const constants =
    gender === 'FEMALE' ? KEYTEL_CONSTANTS.FEMALE : KEYTEL_CONSTANTS.MALE

  // Calculate Energy Expenditure (EE) in kJ/min
  // Formula: EE = Intercept + (HR * C1) + (Weight * C2) + (Age * C3)
  const energyKjPerMin =
    constants.INTERCEPT +
    constants.HR_FACTOR * heartRate +
    constants.WEIGHT_FACTOR * weightKg +
    constants.AGE_FACTOR * age

  // Convert to kcal/min
  const kcalPerMinute = energyKjPerMin / KEYTEL_CONSTANTS.KJ_TO_KCAL

  const totalCalories = kcalPerMinute * durationMinutes

  // Prevent negative values which can occur with low HR in the formula
  return Math.max(0, totalCalories)
}
