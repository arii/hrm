import { signIn, signOut } from 'next-auth/react'

export const useSpotifyAuth = () => {
  const login = () => {
    signIn('spotify', { callbackUrl: '/' })
  }

  const logout = () => {
    signOut({ callbackUrl: '/' })
  }

  return { login, logout }
}
