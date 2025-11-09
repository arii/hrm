// File: app/api/spotify/control/route.ts (Spotify Control REST Handler - Fallback)
/**
 * Spotify Control REST Handler - Fallback/Demonstration Endpoint
 * This route serves as a secure REST endpoint for external control or testing
 * but the primary control commands are sent via WebSocket.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route"; // Import NextAuth options

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);

    if (!session || !session.accessToken) {
        return NextResponse.json({ error: 'Authorization required' }, { status: 401 });
    }

    // This route should ideally only handle complex commands or be an admin route.
    // For simplicity, we acknowledge the REST request here.
    const { command } = await req.json();

    if (!['PLAY', 'PAUSE', 'NEXT', 'PREVIOUS'].includes(command)) {
        return NextResponse.json({ error: 'Invalid command' }, { status: 400 });
    }

    try {
        console.log(`Received REST command: ${command}. NOTE: This is the fallback route.`);

        // In a true implementation, this route would execute the Spotify REST API call directly:
        // const response = await fetch('https://api.spotify.com/v1/me/player/pause', { ... });
        // Since primary control is WS, we simply acknowledge the REST request here.

        return NextResponse.json({ success: true, message: `Command '${command}' received via REST fallback.` });

    } catch (error) {
        console.error('REST control failed:', error);
        return NextResponse.json({ error: 'Internal server error processing command.' }, { status: 500 });
    }
}