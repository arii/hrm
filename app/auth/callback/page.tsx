// app/auth/callback/page.tsx
'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import Cookies from 'js-cookie'

const AuthCallbackPage = () => {
  const { dispatch } = useAuth()
  const router = useRouter()

  useEffect(() => {
    const accessToken = Cookies.get('spotify_access_token')
    if (accessToken) {
      // In a real app, you'd fetch user data from your API here
      const mockUser = { name: 'Spotify User' }
      dispatch({ type: 'LOGIN', payload: mockUser })
      router.push('/')
    } else {
      // Handle error case
      router.push('/login?error=true')
    }
  }, [dispatch, router])

  return <div>Loading...</div>
}

export default AuthCallbackPage
