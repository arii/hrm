
import { NextRequest, NextResponse } from 'next/server'
import { ZodSchema } from 'zod'

type Handler<T> = (
  req: NextRequest,
  validatedBody: T,
  ...args: any[]
) => Promise<NextResponse>

export function withValidation<T>(schema: ZodSchema<T>, handler: Handler<T>) {
  return async (req: NextRequest, ...args: any[]) => {
    const body = await req.json()
    const parsed = schema.parse(body)
    return handler(req, parsed, ...args)
  }
}
