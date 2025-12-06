// components/SpotifyLoginButton.tsx
'use client'

import Cookies from 'js-cookie'
import { v4 as uuidv4 } from 'uuid'
import Button from '@mui/material/Button'
import { getBaseURL } from '@/utils/urls'

const SpotifyLoginButton = () => {
  const handleLogin = () => {
    const state = uuidv4()
    // The state cookie is used for CSRF protection and should expire shortly after the user is redirected back from Spotify.
    // 1 day / 24 hours / 2 = 0.02083 days, which is 30 minutes.
    Cookies.set('spotify_auth_state', state, { expires: 1 / 24 / 2 })

    const scope =
      'user-read-private user-read-email user-read-playback-state user-modify-playback-state streaming'
    const redirectUri = `${getBaseURL()}/api/auth/spotify/callback`

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID || '',
      scope,
      redirect_uri: redirectUri,
      state,
    })

    window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`
  }

  return (
    <Button variant="contained" color="primary" onClick={handleLogin}>
      Login with Spotify
    </Button>
  )
}

export default SpotifyLoginButton
