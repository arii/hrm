import { authOptions } from "@/lib/auth"; // Using alias for cleaner imports
import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";

/**
 * API route to securely provide the Spotify access token to the client.
 *
 * This endpoint is called by the `useSpotifyWebPlayback` hook. It retrieves the
 * access token from the user's server-side session and returns it. This is the
 * recommended way to expose the token to the client-side SDK without exposing
 * it publicly or storing it in an insecure manner.
 *
 * @param _req The incoming Next.js API request (unused).
 * @returns A NextResponse object with the access token or an error.
 */
export async function GET(_req: Request) {
  try {
    // 1. Get the server-side session.
    const session = await getServerSession(authOptions);

    // 2. Check if the session and token exist.
    if (!session || !session.accessToken) {
      console.error("[API /access-token] No session or access token found.");
      return NextResponse.json(
        { error: "Not authenticated or token is missing." },
        { status: 401 }
      );
    }

    // 3. Return the access token.
    return NextResponse.json({
      accessToken: session.accessToken,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "An unknown error occurred.";
    console.error(`[API /access-token] Internal Server Error: ${message}`);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
