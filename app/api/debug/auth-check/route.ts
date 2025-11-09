import { NextResponse } from "next/server";

/**
 * Debug endpoint to verify Spotify OAuth configuration is loaded correctly.
 * This helps diagnose "Invalid Client" and redirect URI issues.
 */
export async function GET() {
  try {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    const nextAuthUrl = process.env.NEXTAUTH_URL;
    const nextAuthSecret = process.env.NEXTAUTH_SECRET;

    return NextResponse.json({
      nextAuthConfigured: !!(nextAuthUrl && nextAuthSecret),
      spotifyConfigured: !!(clientId && clientSecret),
      clientId: clientId || undefined,
      hasClientSecret: !!clientSecret,
      redirectUri: nextAuthUrl
        ? `${nextAuthUrl}/api/auth/callback/spotify`
        : undefined,
    });
  } catch (err) {
    console.error("Auth check failed:", err);
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 }
    );
  }
}
