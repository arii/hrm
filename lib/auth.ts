// File: lib/auth.ts (NextAuth Configuration - Shared)
import NextAuth from "next-auth";
import SpotifyProvider from "next-auth/providers/spotify";

// Define scopes required: user-read-playback-state to poll the current track,
// user-modify-playback-state to control playback (play/pause/skip).
const SPOTIFY_SCOPES = [
    "user-read-email",
    "user-read-playback-state",
    "user-modify-playback-state",
    "user-read-currently-playing",
].join(",");

export const authOptions = {
    providers: [
        SpotifyProvider({
            clientId: process.env.SPOTIFY_CLIENT_ID as string,
            clientSecret: process.env.SPOTIFY_CLIENT_SECRET as string,
            scope: SPOTIFY_SCOPES,
        }),
    ],
    callbacks: {
        async jwt({ token, account }: { token: any; account: any }) {
            // Initial sign in
            if (account) {
                token.accessToken = account.access_token;
                token.refreshToken = account.refresh_token;

                // --- CRITICAL STEP: Deliver Refresh Token to Persistent Service ---
                if (account.refresh_token) {
                    try {
                        // This POSTs the long-lived refresh token to the Express middleware
                        // running in the persistent server.js process.
                        await fetch("http://127.0.0.1:3000/internal/token-delivery", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ refreshToken: account.refresh_token }),
                        });
                        console.log("Internal token delivery successful.");
                    } catch (e) {
                        console.error("Internal token delivery failed:", e);
                    }
                }
            }
            // Future logic for token refresh handled internally by spotifyPolling.ts
            return token;
        },
        async session({ session, token }: { session: any; token: any }) {
            // Expose a minimal token structure to the client session
            session.accessToken = token.accessToken;
            return session;
        },
    },
    // Ensure the token can be accessed securely
    secret: process.env.NEXTAUTH_SECRET,
};

export default NextAuth(authOptions);