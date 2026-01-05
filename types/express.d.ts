// types/express.d.ts
import 'express'

declare global {
  namespace Express {
    export interface Request {
      id?: string
      user?: {
        id?: string
      }
      session?: {
        id?: string
      }
    }
  }
}
