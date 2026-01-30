/**
 * @swagger
 * /api/health/simple:
 *   get:
 *     summary: Returns a simple health check.
 *     description: A minimal endpoint to check if the server is running, suitable for load balancers.
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Server is running.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: 2023-03-15T12:00:00.000Z
 */
// app/api/health/simple/route.ts
import { NextResponse } from 'next/server'

export async function GET() {
  // Minimal health check for load balancer
  return NextResponse.json(
    {
      status: 'ok',
      timestamp: new Date().toISOString(),
    },
    { status: 200 }
  )
}
