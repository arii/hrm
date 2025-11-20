import { getService } from '@/utils/serviceRegistry'
import { NextResponse } from 'next/server'

/**
 * API route to fetch available Spotify devices for the authenticated user.
 *
 * This endpoint now uses the singleton `spotifyService` to retrieve the
 * list of available devices, ensuring that all Spotify API interactions
 * are centralized and managed by the service.
 *
 * @param _req The incoming Next.js API request (unused).
 * @returns A NextResponse object with the device list or an error.
 */
export async function GET(_req: Request) {
  try {
    // 1. Retrieve the spotifyService from the registry.
    const spotifyService = getService('spotifyService')

    // 2. Fetch devices using the service method.
    // The service internally handles authentication and API calls.
    const devices = await spotifyService.getAvailableDevices()

    // 3. Return the devices.
    return NextResponse.json(devices || [])
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'An unknown error occurred.'

    // If the service is not found, the `getService` call will throw an error.
    // We catch it here and return a 503 Service Unavailable status.
    if (message.includes('not found')) {
      console.error(`[API /devices] Service unavailable: ${message}`)
      return NextResponse.json(
        { error: 'Spotify service is not initialized.' },
        { status: 503 }
      )
    }

    console.error(`[API /devices] Internal Server Error: ${message}`)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}
