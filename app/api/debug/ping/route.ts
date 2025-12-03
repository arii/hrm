/**
 * @swagger
 * /api/debug/ping:
 *   get:
 *     summary: Returns the server status and current timestamp.
 *     description: A simple endpoint to check if the server is running.
 *     tags: [Debug]
 *     responses:
 *       200:
 *         description: Server is running.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *                 time:
 *                   type: number
 *                   example: 1678886400000
 */
import { NextResponse } from 'next/server'

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return new NextResponse(null, { status: 404 })
  }
  return NextResponse.json({ ok: true, time: Date.now() })
}
