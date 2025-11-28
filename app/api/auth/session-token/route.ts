// File: app/api/auth/session-token/route.ts (API Route to get raw JWT)
import { getToken } from 'next-auth/jwt'
import { NextRequest, NextResponse } from 'next/server'

const secret = process.env.NEXTAUTH_SECRET

if (!secret) {
  throw new Error('NEXTAUTH_SECRET is not set')
}

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: secret as string, raw: true })

  if (token) {
    return NextResponse.json({ token })
  } else {
    return new NextResponse('Unauthorized', { status: 401 })
  }
}
