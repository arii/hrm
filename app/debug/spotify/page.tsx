// app/debug/spotify/page.tsx
'use client'

import Button from '@mui/material/Button'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import { Session } from 'next-auth'
import { signOut, useSession } from 'next-auth/react'
import { useState } from 'react'
import { API_DEBUG_SPOTIFY_TOKEN } from '@/constants/apiEndpoints'
import { useSpotifyAuth } from '@/hooks/useSpotifyAuth'

// Extend the Session type to include the custom accessToken property
interface ExtendedSession extends Session {
  accessToken?: string
}

export default function SpotifyDebugPage() {
  const { data: session } = useSession()
  // This state is now only for the *manually* fetched token.
  const [fetchedToken, setFetchedToken] = useState<string | null>(null)
  const { login } = useSpotifyAuth()

  const handleFetchToken = async () => {
    try {
      const response = await fetch(API_DEBUG_SPOTIFY_TOKEN)
      if (response.ok) {
        const data = await response.json()
        setFetchedToken(data.accessToken)
      } else {
        console.error('Failed to fetch Spotify token')
      }
    } catch (error) {
      console.error('Error fetching Spotify token:', error)
    }
  }

  // Derive the token to be displayed directly in the render logic.
  // This avoids the `set-state-in-effect` error.
  // Precedence: Manually fetched token > session token > default text.
  const displayedToken =
    fetchedToken ||
    (session as ExtendedSession)?.accessToken ||
    'No token available'

  return (
    <Paper
      elevation={3}
      style={{ padding: '20px', margin: '20px auto', maxWidth: '600px' }}
    >
      <Typography variant="h4" gutterBottom>
        Spotify Debug Information
      </Typography>

      <div style={{ marginBottom: '20px' }}>
        <Typography variant="h6">Authentication</Typography>
        {session ? (
          <>
            <Typography>Signed in as {session.user?.email}</Typography>
            <Button onClick={() => signOut()}>Sign Out</Button>
          </>
        ) : (
          <Button onClick={login}>Link Spotify Account</Button>
        )}
      </div>

      <div style={{ marginBottom: '20px' }}>
        <Typography variant="h6">Spotify Access Token</Typography>
        <Typography
          style={{
            wordWrap: 'break-word',
            fontFamily: 'monospace',
            backgroundColor: '#f5f5f5',
            padding: '10px',
            borderRadius: '4px',
          }}
        >
          {displayedToken}
        </Typography>
        <Button onClick={handleFetchToken} style={{ marginTop: '10px' }}>
          Fetch Server-Side Token
        </Button>
      </div>
    </Paper>
  )
}
