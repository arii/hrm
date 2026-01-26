// app/api/auth/sync/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/env';
import { getToken } from 'next-auth/jwt';

export async function POST(req: NextRequest) {
  const token = await getToken({ req });

  if (!token || !token.accessToken || !token.accessTokenExpiresAt || !token.refreshToken) {
    return NextResponse.json({ error: 'Invalid session token' }, { status: 401 });
  }

  try {
    const response = await fetch(
      `${env.NEXT_PUBLIC_API_URL}/api/internal/token-delivery`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-api-secret': env.INTERNAL_API_SECRET,
        },
        body: JSON.stringify({
          accessToken: token.accessToken,
          accessTokenExpiresAt: token.accessTokenExpiresAt,
          refreshToken: token.refreshToken,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: 'Failed to sync token', details: errorData },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
