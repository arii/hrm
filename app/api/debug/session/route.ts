import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { withQueryValidation } from '@/lib/middleware/validation'
import { debugSessionSchema } from '@/lib/validation/schemas'
import { z } from 'zod'

const handler = async (
  req: NextRequest,
  { query }: { query: z.infer<typeof debugSessionSchema> }
) => {
  try {
    const session = await getServerSession(authOptions)
    // The 'action' query parameter is validated but not used in the logic.
    // The purpose is to demonstrate validation on a simple GET route.
    return NextResponse.json({ ok: true, session: session ?? null, action: query.action })
  } catch (err) {
    console.error('debug/session error:', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}

export const GET = withQueryValidation(debugSessionSchema, handler)
