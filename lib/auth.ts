// File: lib/auth.ts (NextAuth Configuration - Shared)
import NextAuth, { Account, AuthOptions, Session } from "next-auth";
import { JWT } from "next-auth/jwt";
import SpotifyProvider from "next-auth/providers/spotify";
import { getAPIURL } from '../utils/urls';

// Extend the Session type to include accessToken
declare module "next-auth" {
  interface Session {
    accessToken?: string;
  }
}

// Define scopes required: user-read-playback-state to poll the current track,
// user-modify-playback-state to control playback (play/pause/skip),
// streaming for Web Playback SDK (play music in browser).
const SPOTIFY_SCOPES = [
  "user-read-private",
  "user-top-read",
  "user-read-email",
  "user-read-playback-state",
  "user-modify-playback-state",
  "user-read-currently-playing",
  "streaming", // Required for Web Playback SDK
].join(",");

export const authOptions: AuthOptions = {
  providers: [
    SpotifyProvider({
      clientId: process.env.SPOTIFY_CLIENT_ID as string,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET as string,
      authorization: {
        params: {
          scope: SPOTIFY_SCOPES,
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }: { token: JWT; account: Account | null }) {
      // Initial sign in
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;

        // --- CRITICAL STEP: Deliver Refresh Token to Persistent Service ---
        if (account.refresh_token) {
          try {
            // This POSTs the full account/token data to the token delivery endpoint
            // so it can be persisted to logs/spotify_tokens.json for the server to use.
            const tokenPayload = {
              provider: account.provider,
              sub: account.providerAccountId,
              access_token: account.access_token,
              refresh_token: account.refresh_token,
              expires_in: account.expires_at
                ? Math.floor((account.expires_at * 1000 - Date.now()) / 1000)
                : 3600,
              scope: account.scope || "",
              obtainedAt: Date.now(),
            };

            const response = await fetch(
              getAPIURL('internal/token-delivery'),
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(tokenPayload),
              }
            );
            const responseBody = await response.text();
            if (response.ok) {
              console.log(
                "Internal token delivery successful. Status:",
                response.status,
                "Body:",
                responseBody
              );
            } else {
              console.error(
                "Internal token delivery failed. Status:",
                response.status,
                "Body:",
                responseBody
              );
            }
          } catch (e) {
            console.error("Internal token delivery failed:", e);
          }
        }
      }
      // Future logic for token refresh handled internally by spotifyPolling.ts
      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      // Expose a minimal token structure to the client session
      if (token.accessToken && typeof token.accessToken === "string") {
        session.accessToken = token.accessToken;
      }
      return session;
    },
  },
  // Ensure the token can be accessed securely
  secret: process.env.NEXTAUTH_SECRET,
};

export default NextAuth(authOptions);
