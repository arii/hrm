import { NextResponse } from 'next/server'

/**
 * @swagger
 * /api/health/network-check:
 *   get:
 *     summary: Performs a basic network connectivity check.
 *     description: |
 *       This endpoint is used by the frontend client to verify that it has a working
 *       internet connection and can reach the server. It's a lightweight endpoint
 *       that simply returns a 200 OK status to confirm connectivity.
 *     tags:
 *       - Health
 *     responses:
 *       200:
 *         description: Successfully connected to the server.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *       503:
 *         description: The server is not available.
 */
export async function GET() {
  return NextResponse.json({ status: 'ok' })
}
