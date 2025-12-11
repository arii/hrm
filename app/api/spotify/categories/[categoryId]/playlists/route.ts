// app/api/spotify/categories/[categoryId]/playlists/route.ts
import { authOptions } from '@/lib/auth'
import { SpotifyApi } from '@spotify/web-api-ts-sdk'
import { getServerSession } from 'next-auth/next'
import { NextResponse } from 'next/server'
import { withErrorHandlerDynamic } from '@/lib/middleware/errorHandlerDynamic'
import { ApiError } from '@/lib/errors'

async function getPlaylistsForCategory(
  _req: Request,
  { params }: { params: { categoryId: string } }
) {
  const session = await getServerSession(authOptions)

  if (!session || !session.accessToken) {
    throw new ApiError(401, 'Not authenticated or token is missing.')
  }

  const spotify = SpotifyApi.withAccessToken(
    process.env.SPOTIFY_CLIENT_ID || '',
    {
      access_token: session.accessToken,
      token_type: 'Bearer',
      expires_in: 3600, // Approximate, actual expiry handled by NextAuth
      refresh_token: '', // Not needed for this use case
    }
  )

  const { categoryId } = params

  const playlistsResponse = await spotify.browse.getPlaylistsForCategory(
    categoryId,
    undefined,
    50
  )

  const playlists = playlistsResponse.playlists.items.map((playlist) => ({
    id: playlist.id,
    name: playlist.name,
    uri: playlist.uri,
    description: playlist.description || null,
    imageUrl: playlist.images?.[0]?.url || null,
    trackCount: playlist.tracks?.total || 0,
    owner: playlist.owner?.display_name || 'Spotify',
  }))

  return NextResponse.json({ playlists })
}

export const GET = withErrorHandlerDynamic(getPlaylistsForCategory)
