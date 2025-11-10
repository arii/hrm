import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";

/**
 * API route to fetch available Spotify devices for the authenticated user.
 *
 * This endpoint retrieves the list of devices from the Spotify API and returns
 * them to the client. This is used by the control panel to allow the user to
 * select which device to play music on.
 *
 * @param _req The incoming Next.js API request (unused).
 * @returns A NextResponse object with the device list or an error.
 */
export async function GET(_req: Request) {
  try {
    // 1. Get the server-side session.
    const session = await getServerSession(authOptions);

    // 2. Check if the session and token exist.
    if (!session || !session.accessToken) {
      console.error("[API /devices] No session or access token found.");
      return NextResponse.json(
        { error: "Not authenticated or token is missing." },
        { status: 401 }
      );
    }

    // 3. Fetch devices from Spotify API.
    const response = await fetch(
      "https://api.spotify.com/v1/me/player/devices",
      {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `[API /devices] Spotify API error: ${response.status} ${errorText}`
      );
      return NextResponse.json(
        { error: "Failed to fetch devices from Spotify." },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data.devices || []);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "An unknown error occurred.";
    console.error(`[API /devices] Internal Server Error: ${message}`);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
