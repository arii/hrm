// app/api/auth/spotify/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAPIURL } from '../../../../../utils/urls';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  // We need to retrieve the stored state and code verifier.
  // In a real app, you'd get this from a secure, HttpOnly cookie
  // or a server-side session. For this implementation, we'll
  // assume they were passed back to this serverless function somehow,
  // perhaps via a short-lived DB entry or encrypted cookie.
  // Since we can't access localStorage from the server,
  // we'll rely on the client to send them back. This is NOT ideal
  // for production but demonstrates the flow. A better approach is
  // to use cookies to store the state and code_verifier.

  // Let's modify the plan to use cookies instead of localStorage
  // For now, this will fail, and we will fix it in the next steps.
  const storedState = req.cookies.get('spotify_auth_state')?.value;
  const codeVerifier = req.cookies.get('spotify_code_verifier')?.value;

  if (!state || state !== storedState) {
    return NextResponse.json({ error: 'State mismatch' }, { status: 400 });
  }

  if (!code || !codeVerifier) {
    return NextResponse.json({ error: 'Missing code or verifier' }, { status: 400 });
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  const redirectUri = `${new URL(req.url).origin}/api/auth/spotify/callback`;

  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: 'Missing Spotify credentials' }, { status: 500 });
  }

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    }),
  });

  const tokens = await response.json();

  if (!response.ok) {
    return NextResponse.json(tokens, { status: response.status });
  }

  // --- CRITICAL STEP: Deliver Refresh Token to Persistent Service ---
  try {
    const tokenPayload = {
      provider: 'spotify',
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_in: tokens.expires_in,
      scope: tokens.scope,
      obtainedAt: Date.now(),
    };

    const internalResponse = await fetch(getAPIURL('internal/token-delivery'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tokenPayload),
    });

    if (!internalResponse.ok) {
      const responseBody = await internalResponse.text();
      console.error(
        'Internal token delivery failed. Status:',
        internalResponse.status,
        'Body:',
        responseBody
      );
      // Decide how to handle this - maybe redirect with an error?
    }
  } catch (e) {
    console.error('Internal token delivery failed:', e);
  }

  // Redirect user to the main page
  const url = req.nextUrl.clone()
  url.pathname = '/'
  url.search = '' // Clear search params

  // Clean up cookies
  const res = NextResponse.redirect(url);
  res.cookies.delete('spotify_auth_state');
  res.cookies.delete('spotify_code_verifier');

  return res;
}
