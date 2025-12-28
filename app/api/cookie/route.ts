// app/api/cookie/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withValidation } from '@/lib/middleware/validation'
import logger from '@/utils/logger'
import {
  CSRF_COOKIE_NAME,
  generateCsrfToken,
} from '@/lib/csrf'
import { nanoid } from 'nanoid'

const cookieSchema = z.object({
  name: z.string(),
  value: z.any(),
  options: z.object({
    httpOnly: z.boolean().optional(),
    secure: z.boolean().optional(),
    sameSite: z.enum(['strict', 'lax', 'none']).optional(),
    path: z.string().optional(),
    maxAge: z.number().optional(),
  }).optional(),
})

type CookieRequestBody = z.infer<typeof cookieSchema>

async function handler(req: NextRequest & { parsedBody: CookieRequestBody }) {
  const { name, value, options } = req.parsedBody

  try {
    const response = NextResponse.json({ success: true })

    // Set the requested cookie
    response.cookies.set(name, value, options)

    // Also ensure the CSRF cookie is set
    if (!req.cookies.has(CSRF_COOKIE_NAME)) {
      const { secret } = generateCsrfToken()
      response.cookies.set({
        name: CSRF_COOKIE_NAME,
        value: secret,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
      })
    }

    return response
  } catch (error) {
    logger.error('Error setting cookie:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}

export const POST = withValidation(cookieSchema, handler)
