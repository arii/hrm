import { z } from '../zod'

export const UserSettingsSchema = z.object({
  userName: z.string().min(1, 'Name is required.'),
  userAge: z.preprocess(
    (val) => (String(val).trim() === '' ? NaN : Number(val)),
    z
      .number({ invalid_type_error: 'Age is required.' })
      .min(1, 'Age must be at least 1.')
      .max(120, 'Age must be 120 or less.')
  ),
  userWeight: z.preprocess(
    (val) => (String(val).trim() === '' ? NaN : Number(val)),
    z
      .number({ invalid_type_error: 'Weight is required.' })
      .positive('Weight must be a positive number.')
  ),
})
