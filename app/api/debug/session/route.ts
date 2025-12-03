import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'

/**
 * @openapi
 * /api/debug/session:
 *   get:
 *     summary: Get Current Session
 *     description: >
 *       A debug endpoint to retrieve the current server-side NextAuth session object.
 *       Useful for inspecting tokens and user details during development.
 *     tags:
 *       - Debug
 *     responses:
 *       200:
 *         description: The current session object (or null if not authenticated).
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *                 session:
 *                   $ref: '#/components/schemas/NextAuthSession'
 *       500:
 *         description: An error occurred while fetching the session.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export async function GET(_req: Request) {
  try {
    const session = await getServerSession(authOptions)
    return NextResponse.json({ ok: true, session: session ?? null })
  } catch (err) {
    console.error('debug/session error:', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
