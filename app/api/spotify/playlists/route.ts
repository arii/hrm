// app/api/spotify/playlists/route.ts
import { NextResponse } from 'next/server'
import {
  getPresetPlaylists,
  getUserPlaylists,
} from '../../../../services/spotifyPlaylistService'
import { getToken } from 'next-auth/jwt'
import { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })

  if (!token || !token.accessToken) {
    // If no token, return only preset playlists.
    const presetPlaylists = getPresetPlaylists()
    return NextResponse.json({
      presetPlaylists,
      userPlaylists: [],
    })
  }

  try {
    const [presetPlaylists, userPlaylists] = await Promise.all([
      getPresetPlaylists(),
      getUserPlaylists(token.accessToken as string),
    ])

    return NextResponse.json({
      presetPlaylists,
      userPlaylists,
    })
  } catch (error) {
    console.error('Error fetching playlists:', error)
    return NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    )
  }
}
