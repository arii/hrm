// File: app/api/auth/[...nextauth]/route.ts (NextAuth Configuration - Spotify OAuth Gateway)
/**
 * NextAuth Configuration File: Handles the Spotify OAuth 2.0 flow.
 * CRITICAL: This route intercepts the refresh token and sends it to the persistent
 * server service via the internal /internal/token-delivery endpoint.
 */
import NextAuth from "next-auth";
import SpotifyProvider from "next-auth/providers/spotify";

type TokenShape = {
  accessToken?: string;
  accessTokenExpires?: number;
  refreshToken?: string;
  error?: string;
  sub?: string;
};

async function refreshAccessToken(token: TokenShape): Promise<TokenShape> {
  try {
    const url = "https://accounts.spotify.com/api/token";
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: token.refreshToken || "",
    }).toString();

    const basic = Buffer.from(
      `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
    ).toString("base64");

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });

    const data = await res.json();
    if (!res.ok) throw data;

    return {
      ...token,
      accessToken: data.access_token,
      accessTokenExpires: Date.now() + (data.expires_in || 3600) * 1000,
      refreshToken: data.refresh_token ?? token.refreshToken,
    };
  } catch (error) {
    return { ...token, error: "RefreshAccessTokenError" };
  }
}

const authOptions = {
  providers: [
    SpotifyProvider({
      clientId: process.env.SPOTIFY_CLIENT_ID || "",
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET || "",
      authorization: {
        params: {
          scope:
            "user-read-email user-read-private user-read-playback-state user-modify-playback-state streaming user-read-currently-playing user-read-recently-played playlist-read-private",
        },
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async jwt({ token, account, user }: any) {
      // Initial sign in
      if (account && user) {
        return {
          ...token,
          accessToken: account.access_token,
          accessTokenExpires: Date.now() + (account.expires_in || 3600) * 1000,
          refreshToken: account.refresh_token,
          sub: token.sub ?? user.id ?? token.sub,
        };
      }

      // Return previous token if not expired
      if (Date.now() < (token.accessTokenExpires || 0)) {
        return token;
      }

      // Access token has expired -> refresh
      return await refreshAccessToken(token);
    },

    async session({ session, token }: any) {
      session.user = session.user ?? {};
      session.accessToken = token.accessToken;
      session.refreshToken = token.refreshToken;
      session.error = token.error;
      return session;
    },
  },
  // Optional: set pages to use custom sign in UI if desired
  // pages: { signIn: "/api/auth/signin" },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
