# ADR: Gender-Inclusive Calorie Estimation

## Status

Accepted

## Context

The previous calorie estimation logic used a formula that defaulted to male-centric coefficients, leading to potential inaccuracies and a lack of inclusivity for users of other genders. The `estimateCaloriesBurned` function used an `isMale` boolean flag, which is not as clear or extensible as a more explicit `gender` parameter.

## Decision

We will refactor the `estimateCaloriesBurned` function in `lib/calorie-estimation.ts` to accept a `gender` parameter, which can be 'male', 'female', or 'neutral'.

The function will use the following formulas:
- **Male:** `(-55.0969 + 0.6309 * HR + 0.1988 * weight + 0.2017 * age) / 4.184`
- **Female:** `(-20.4022 + 0.4472 * HR - 0.1263 * weight + 0.074 * age) / 4.184`

For the 'neutral' gender option, and as a default when no gender is specified, we will use the female formula. This decision is based on the principle of providing a more conservative and safer estimate of calories burned, which is generally considered a better practice in fitness applications.

This change will be propagated to all the hooks and utilities that use this function, namely `useCalorieCalculator.ts`, `useCalorieTracker.ts`, and `socketManager.ts`. In the case of `socketManager.ts`, where user-specific gender information is not available, the 'neutral' option will be used explicitly.

## Consequences

- The calorie estimation logic is now more accurate and inclusive for all users.
- The code is more readable and maintainable due to the explicit `gender` parameter.
- The use of a 'neutral' default ensures that the system provides a safe and conservative estimate when gender is not specified.
- Existing and new components that use calorie estimation will need to be aware of the new `gender` parameter.
