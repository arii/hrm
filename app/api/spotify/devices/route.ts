<<<<<<< HEAD
// File: app/api/spotify/devices/route.ts
||||||| dfe03eb
import { authOptions } from '@/lib/auth'
import { getServerSession } from 'next-auth/next'
import { NextResponse } from 'next/server'

=======
import { authOptions } from '@/lib/auth'
import { ApiError } from '@/lib/errors'
import { getServerSession } from 'next-auth/next'
import { NextResponse } from 'next/server'

>>>>>>> origin/leader
/**
 * API Route: /api/spotify/devices
 * Description: Retrieves the list of available Spotify Connect devices.
 * This endpoint accesses the running SpotifyPolling service instance to fetch
 * the device data.
 */
import { getServices } from '../../../../services/serviceManager'
import { NextRequest, NextResponse } from 'next/server'

<<<<<<< HEAD
export async function GET(_req: NextRequest) {
  try {
    const { spotifyService } = getServices()
||||||| dfe03eb
    // 2. Check if the session and token exist.
    if (!session || !session.accessToken) {
      console.error('[API /devices] No session or access token found.')
      return NextResponse.json(
        { error: 'Not authenticated or token is missing.' },
        { status: 401 }
      )
    }

    // 3. Fetch devices from Spotify API.
    const response = await fetch(
      'https://api.spotify.com/v1/me/player/devices',
      {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
      }
    )
=======
    // 2. Check if the session and token exist.
    if (!session || !session.accessToken) {
      throw new ApiError(401, 'Not authenticated or token is missing.')
    }

    // 3. Fetch devices from Spotify API.
    const response = await fetch(
      'https://api.spotify.com/v1/me/player/devices',
      {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
      }
    )
>>>>>>> origin/leader

    if (!spotifyService || typeof spotifyService.getAvailableDevices !== 'function') {
      return NextResponse.json(
        { error: 'Spotify service is not available or initialized.' },
        { status: 503 } // 503 Service Unavailable
      )
    }

<<<<<<< HEAD
    const devices = await spotifyService.getAvailableDevices()
    return NextResponse.json(devices)
  } catch (err) {
    console.error('/api/spotify/devices error:', err)
||||||| dfe03eb
    const data = await response.json()
    return NextResponse.json(data.devices || [])
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'An unknown error occurred.'
    console.error(`[API /devices] Internal Server Error: ${message}`)
=======
    const data = await response.json()
    return NextResponse.json(data.devices || [])
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      )
    }
    const message =
      error instanceof Error ? error.message : 'An unknown error occurred.'
    console.error(`[API /devices] Internal Server Error: ${message}`)
>>>>>>> origin/leader
    return NextResponse.json(
      { error: 'An unexpected error occurred.' },
      { status: 500 }
    )
  }
}
