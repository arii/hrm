# Calorie Estimation Module

## Overview

This document provides internal documentation for the standalone Calorie Estimation module. This module is designed to provide a simple, consistent, and testable way to estimate calorie expenditure based on user physiological data and activity.

## Public API

The module exposes a single primary function for all calorie estimations.

### `estimateCaloriesBurned(params: CalorieEstimationParams): number`

This function implements a widely recognized formula for calorie expenditure that relies on heart rate, age, and weight. It is the recommended function for all new calorie estimations within the application.

-   **Returns:** `number` - The estimated number of calories burned. The function will always return a non-negative value.

## Input Parameters

The `estimateCaloriesBurned` function accepts a single object, `CalorieEstimationParams`, with the following structure:

```typescript
export interface CalorieEstimationParams {
  heartRate: number; // The user's average heart rate during the activity.
  age: number; // The user's age in years.
  weightKg: number; // The user's weight in kilograms.
  durationMinutes: number; // The duration of the activity in minutes.
}
```

## Expected Output

The function returns a single `number` representing the total estimated calories burned during the activity. The value is a floating-point number and is always greater than or equal to zero.

## Configurable Options

There are no configurable options for this module. The constants used in the formula are derived from scientific literature and are not intended to be modified.

## Integration and Usage Examples

To use the module, import the `estimateCaloriesBurned` function and the `CalorieEstimationParams` interface.

### Example: Calculating Calories for a Workout

```typescript
import {
  estimateCaloriesBurned,
  CalorieEstimationParams,
} from 'lib/calorie-estimation';

// User and workout data
const userData = {
  age: 35,
  weightKg: 75,
};

const workoutData = {
  averageHeartRate: 150,
  durationMinutes: 30,
};

// Prepare the parameters for the estimation function
const calorieParams: CalorieEstimationParams = {
  heartRate: workoutData.averageHeartRate,
  age: userData.age,
  weightKg: userData.weightKg,
  durationMinutes: workoutData.durationMinutes,
};

// Estimate the calories burned
const caloriesBurned = estimateCaloriesBurned(calorieParams);

console.log(`Estimated calories burned: ${caloriesBurned.toFixed(2)} kcal`);
// Example output: Estimated calories burned: 441.00 kcal
```

## Algorithm and Limitations

### Chosen Algorithm

The calorie estimation is based on a formula derived from the **Journal of Sports Sciences**. The specific formula is a gender-neutral adaptation that uses heart rate, age, and weight to estimate energy expenditure.

The core formula is:

`Calories/Minute = (-55.0969 + (0.6309 * heartRate) + (0.1988 * weightKg) + (0.2017 * age)) / 4.184`

The constant `4.184` is used to convert the result from kilojoules (kJ) to kilocalories (kcal).

### Limitations

-   **Gender-Neutral:** The formula is gender-neutral, which simplifies its application but may be slightly less accurate than gender-specific formulas.
-   **METs Abstraction:** This formula does not directly use Metabolic Equivalents (METs), which are another common method for calorie estimation. It relies on heart rate as a primary indicator of intensity.
-   **Individual Variation:** Calorie expenditure can vary significantly between individuals due to factors not included in the formula, such as body composition, fitness level, and genetics.
-   **Accuracy:** While based on a scientifically validated formula, the estimation should be considered an approximation. The accuracy is highly dependent on the quality of the input data, especially the average heart rate.
