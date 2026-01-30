// lib/fitness.ts

export const CALORIE_COEFFICIENTS = {
  MALE: {
    BASE: -55.0969,
    HR: 0.6309,
    WEIGHT: 0.1988,
    AGE: 0.2017,
  },
  FEMALE: {
    BASE: -20.4022,
    HR: 0.4472,
    WEIGHT: -0.1263,
    AGE: 0.074,
  },
  CONVERSION_FACTOR: 4.184,
}
