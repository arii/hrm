// types/express.d.ts
import 'express'
import { Session } from 'next-auth'

declare module 'express' {
  interface Request {
    id?: string
    user?: {
      id?: string
    }
    session?: Session & {
      user?: {
        id?: string
      }
    }
  }
}
