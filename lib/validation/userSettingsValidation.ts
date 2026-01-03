import { z } from '../zod'

export const UserSettingsSchema = z.object({
  userName: z.string().min(1, 'Name is required.'),
  userAge: z.coerce
    .number()
    .min(1, 'Age must be at least 1.')
    .max(120, 'Age must be 120 or less.'),
  userWeight: z.coerce.number().positive('Weight must be a positive number.'),
})
