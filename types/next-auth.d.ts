import 'next-auth'

declare module 'next-auth' {
  interface Session {
    accessToken?: string
    error?: string
    user?: {
      id?: string | null
    } & DefaultSession['user']
  }

  interface User {
    id?: string
  }
}
