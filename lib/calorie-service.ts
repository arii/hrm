// File: lib/calorie-service.ts
import {
  type CalorieCalculator,
  type CalorieEstimationParams,
  KeytelFormula,
} from './calorie-estimation'

export class CalorieService {
  private readonly calculator: CalorieCalculator

  constructor(calculator?: CalorieCalculator) {
    this.calculator = calculator ?? new KeytelFormula()
  }

  public estimateCalories(params: CalorieEstimationParams): number {
    return this.calculator.calculate(params)
  }
}

// Global instance for backward compatibility
const calorieService = new CalorieService()

export const estimateCaloriesBurned = (
  params: CalorieEstimationParams
): number => {
  return calorieService.estimateCalories(params)
}
