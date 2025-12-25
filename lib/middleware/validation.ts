// lib/middleware/validation.ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

export const withValidation = <T extends z.ZodType<unknown, unknown>>(
  schema: T,
  handler: (req: NextRequest, data: z.infer<T>) => Promise<NextResponse>
) => {
  return async (req: NextRequest) => {
    try {
      const body = await req.json()
      const parsed = schema.parse(body)
      return handler(req, parsed)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({ errors: error.issues }, { status: 400 })
      }
      return NextResponse.json(
        { errors: [{ message: 'Invalid request' }] },
        { status: 400 }
      )
    }
  }
}
