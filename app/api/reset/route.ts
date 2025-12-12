// app/api/reset/route.ts
import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

// Define the path to the Spotify tokens file
const TOKENS_FILE_PATH = path.resolve(process.cwd(), 'logs/spotify_tokens.json')

/**
 * @swagger
 * /api/reset:
 *   post:
 *     summary: Resets the application state
 *     description: Clears client-side storage (cookies, localStorage) and server-side storage (Spotify tokens).
 *     responses:
 *       200:
 *         description: Server state reset successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Server state reset successfully.
 *       500:
 *         description: Failed to reset server state.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Failed to reset server state.
 *                 error:
 *                   type: string
 */
export async function POST() {
  try {
    // Clear Spotify tokens file
    try {
      await fs.unlink(TOKENS_FILE_PATH)
    } catch (error: any) {
      // If the file doesn't exist, that's fine, just log it.
      if (error.code !== 'ENOENT') {
        throw error // Re-throw other errors
      }
      console.log('Spotify tokens file not found, nothing to clear.')
    }

    return NextResponse.json({ message: 'Server state reset successfully.' })
  } catch (error) {
    console.error('Error resetting server state:', error)
    return NextResponse.json(
      { message: 'Failed to reset server state.', error: String(error) },
      { status: 500 }
    )
  }
}
