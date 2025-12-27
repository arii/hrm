// types/validation.ts

export type ValidationRule =
  | { type: 'required' }
  | { type: 'email' }
  | { type: 'positiveInteger' }
  | { type: 'minLength'; value: number }

export type ValidationRuleType = ValidationRule['type']
