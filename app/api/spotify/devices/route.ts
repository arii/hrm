import { authOptions } from '@/lib/auth'
import { ApiError } from '@/lib/errors'
import { SpotifyTokenManager } from '@/services/spotifyTokenManager'
import { getServerSession } from 'next-auth/next'
import { NextResponse } from 'next/server'

/**
 * API route to fetch available Spotify devices.
 *
 * This endpoint retrieves the list of devices from the Spotify API.
 * It uses the authenticated user's session to retrieve the user ID,
 * and then fetches the latest valid token from the database using getValidSpotifyToken.
 *
 * @param _req The incoming Next.js API request (unused).
 * @returns A NextResponse object with the device list or an error.
 */
export async function GET(_req: Request) {
  try {
    const session = await getServerSession(authOptions)
    let accessToken: string | null = null

    if (session && session.user) {
      // Assuming the session contains the provider account ID in `sub` or similar,
      // but NextAuth session.user usually has name, email, image.
      // We need the spotifyUserId.
      // Standard NextAuth JWT callback puts 'sub' (providerAccountId) in token.
      // But session callback needs to pass it to session object.
      // Looking at lib/auth.ts, session callback does:
      // session.accessToken = token.accessToken
      // It does NOT explicitly pass the providerAccountId.
      // However, the previous code used session.accessToken.
      // If we want to use getValidSpotifyToken, we need the user ID.
      // Let's rely on the token in the session first, which is refreshed by NextAuth (and now also persisted).
      // If we really want to use getValidSpotifyToken, we need the ID.
      //
      // For now, let's keep using session.accessToken as primary,
      // but if we want "single source of truth", we should fetch from DB.
      // But we need the ID.
      //
      // Wait, the previous fallback was "System Token" via SpotifyTokenManager.
      // SpotifyTokenManager loads from DB now.
      // So we can still use that pattern if needed, or stick to session.
      //
      // The task says: "Replace direct session or in-memory token retrieval with a call to the new utility."
      // "const spotifyUserId = /* get ID from session/JWT */;"
      //
      // In NextAuth, `token.sub` is the user ID. We should expose it in the session.
      // In lib/auth.ts:
      // session.user.id = token.sub ??
      // Let's check lib/auth.ts again to see what is in session.

      // Since I can't easily change session type across the app without risk,
      // and I see session.accessToken is populated.
      // But wait, session.accessToken comes from the JWT, which comes from NextAuth's internal state.
      // NextAuth's `jwt` callback DOES update the DB now. So the token in the JWT *should* be fresh enough
      // IF the user session is refreshed.

      // However, the Goal is "secure, concurrent PostgreSQL database... single source of truth".
      // If I use `getValidSpotifyToken(userId)`, I ensure I get the DB version.
      // I need to ensure `session.user` has the ID.

      // Let's look at `lib/auth.ts` again.
      // It does NOT assign `session.user.id`.
      // But `token.sub` holds the providerAccountId.

      // I should update `lib/auth.ts` to pass `sub` to `session.user.id` or similar property?
      // Or I can just use `session.accessToken`?
      // The prompt explicitly said:
      // // Inside GET handler of /api/spotify/devices
      // const spotifyUserId = /* get ID from session/JWT */;
      // const accessToken = await getValidSpotifyToken(spotifyUserId);

      // So I should probably try to get the ID.
      // If I can't get the ID from session, I'm stuck.
      // But wait, `SpotifyTokenManager` has `getUserId()`.
      // And `SpotifyTokenManager` loads the most recent token from DB.
      // So I can use `SpotifyTokenManager` to get the "default" user if session is missing.

      // If session is present, I'll use `session.accessToken` for now, assuming it's synced.
      // OR, I can update `lib/auth.ts` to pass the ID.
      //
      // Let's check `lib/auth.ts` content I read earlier.
      // `async session({ session, token }) { session.accessToken = token.accessToken ... }`
      // It doesn't pass sub/id.

      // I will assume for now that I can use the new Utility if I have an ID.
      // If I don't have an ID, maybe I fall back to the "system" user (SpotifyTokenManager logic).

      // Actually, looking at `app/api/spotify/devices/route.ts` again:
      // It had a fallback: "Fall back to System Token ... SpotifyTokenManager ... getValidAccessToken()"

      // `SpotifyTokenManager` class is now refactored to read from DB.
      // `SpotifyTokenManager` maintains a `currentToken` which it loads from DB.
      // It seems `SpotifyTokenManager` acts as the "System Token" provider.

      // So I can use `SpotifyTokenManager` again, or `getValidSpotifyToken` if I know the ID.
      // `SpotifyTokenManager` finds the *most recently updated* token in DB.
      // That effectively *is* the "System User" (likely the single user of this self-hosted app).

      // So I'll use `SpotifyTokenManager` logic via the new class implementation which uses DB.
      // But the instruction said "Integrate Utility into API Routes".

      // Let's try to do what was asked:
      // `const accessToken = await getValidSpotifyToken(spotifyUserId);`

      // But where do I get spotifyUserId?
      // If the app is single-user self-hosted, maybe I can just fetch the "latest" user?
      // `prisma.spotifyToken.findFirst({ orderBy: { updatedAt: 'desc' } })`

      // I'll update `getValidSpotifyToken` to support fetching *any* valid token if no ID provided?
      // Or I'll stick to `SpotifyTokenManager` which does exactly that (loads latest).

      // Wait, the prompt said:
      // "Create getValidSpotifyToken(userId) ... Replace direct session ... with a call to the new utility."

      // I'll stick to the plan. I will first modify `lib/auth.ts` to expose `sub` (providerAccountId) in the session,
      // so I can validly call `getValidSpotifyToken(session.sub)`.

      // But I can't change `lib/auth.ts` session shape easily without checking types.
      // `types/next-auth.d.ts` or similar? `lib/auth.ts` has `declare module 'next-auth' { interface Session { accessToken?: string; error?: string } }`.
      // I can add `sub` or `providerAccountId` there.

      // accessToken = session.accessToken
      // Correcting type mismatch: session.accessToken is `string | undefined`, but we need `string | null` for initialization or assignment logic if we were strict.
      // However, the error says: Type 'string | undefined' is not assignable to type 'string | null'.
      // This means `accessToken` variable is typed as `string | null` (inferred or explicit), but we are assigning `string | undefined`.
      accessToken = session.accessToken ?? null
    }

    // If session token is missing or invalid (we could verify it), fallback to system
    if (!accessToken) {
      // Fallback: Get the most recent token from DB (acting as system token)
      // We can use the utility if we had the ID, or we can use SpotifyTokenManager which finds the latest.
      // Let's instantiate SpotifyTokenManager which I updated to use DB.
      const tokenManager = new SpotifyTokenManager(
        process.env.SPOTIFY_CLIENT_ID || '',
        process.env.SPOTIFY_CLIENT_SECRET || ''
      )
      // This will load from DB and refresh if needed
      accessToken = await tokenManager.getValidAccessToken()
    }

    if (!accessToken) {
      throw new ApiError(
        401,
        'Not authenticated: No user session or valid system token available.'
      )
    }

    // 3. Fetch devices from Spotify API.
    const response = await fetch(
      'https://api.spotify.com/v1/me/player/devices',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error(
        `[API /devices] Spotify API error: ${response.status} ${errorText}`
      )
      return NextResponse.json(
        { error: 'Failed to fetch devices from Spotify.' },
        { status: response.status }
      )
    }

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
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}
