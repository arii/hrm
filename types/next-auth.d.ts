import 'next-auth'
import { JWT } from 'next-auth/jwt'

declare module 'next-auth' {
  interface Session {
    accessToken?: string
    error?: string
    user?: {
      id?: string | null
    } & DefaultSession['user']
  }

  interface User {
    id: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string
  }
}
