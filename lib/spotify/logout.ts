import { signOut } from 'next-auth/react'

export const logoutSpotify = async () => {
  await signOut({ redirect: false })
  window.location.reload()
}
