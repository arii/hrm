// lib/session.ts
import { getIronSession, IronSession, IronSessionData } from 'iron-session'
import { cookies } from 'next/headers'
import { env } from './env'

export interface SessionData extends IronSessionData {
  token?: {
    provider: string
    sub: string
    access_token: string
    refresh_token: string
    expires_in: number
    scope: string
    obtainedAt: number
  }
}

export const sessionOptions = {
  password: env.NEXTAUTH_SECRET,
  cookieName: 'hrm-session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
  },
}

export async function getSession(): Promise<IronSession<SessionData>> {
  const session = await getIronSession<SessionData>(cookies(), sessionOptions)
  return session
}
